#!/bin/bash
# Diagnose the autopost issue by querying production endpoints
set -e

BASE="https://sonidoliquido.com"
echo "=== Autopost Diagnostic at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

echo ""
echo "=== 1. Kill switch status (should show EMERGENCY KILL SWITCH if deployed) ==="
curl -sS -m 10 -X GET "$BASE/.netlify/functions/social-auto-post" \
  -H "Accept: application/json" | python3 -m json.tool 2>&1 | head -10

echo ""
echo "=== 2. Today's counts (feed posts and stories since midnight CST) ==="
curl -sS -m 10 "$BASE/api/admin/social?action=today-counts" \
  -H "Accept: application/json" | python3 -m json.tool 2>&1 | head -15

echo ""
echo "=== 3. Story history (all IG stories from past 14 days) ==="
curl -sS -m 10 "$BASE/api/admin/social?action=story-history" \
  -H "Accept: application/json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
data = d.get('data', {})
if 'stories' in data:
    print(f\"Count: {data.get('count', 0)}\")
    print(f\"Window: {data.get('window', 'N/A')}\")
    print(f\"Since: {data.get('since', 'N/A')}\")
    print()
    print('Recent stories (most recent first):')
    for s in data.get('stories', [])[:30]:
        print(f\"  {s.get('postedAt')} | {s.get('status'):7} | {s.get('queueId'):40} | {s.get('contentType'):15} | {s.get('sourceId')}\")
        if s.get('errorMessage'):
            print(f\"    ERROR: {s.get('errorMessage')}\")
else:
    print('story-history endpoint not deployed yet. Got:')
    print(json.dumps(d, indent=2)[:500])
" 2>&1 | head -40

echo ""
echo "=== 4. Current schedule config ==="
curl -sS -m 10 "$BASE/api/admin/social" \
  -H "Accept: application/json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
cfg = d.get('data', {}).get('scheduleConfig', {})
print(f\"Feed schedule (CST hours): {cfg.get('scheduleHours', [])}\")
print(f\"Story schedule (CST hours): {cfg.get('storyScheduleHours', [])}\")
print(f\"Posts per run: {cfg.get('postsPerRun')}\")
print(f\"Max posts per day: {cfg.get('maxPostsPerDay')}\")
print(f\"Max stories per day: {cfg.get('maxStoriesPerDay')}\")
" 2>&1 | head -10

echo ""
echo "=== 5. Debug autopost (full diagnostics) ==="
curl -sS -m 15 -X POST "$BASE/api/admin/social" \
  -H "Content-Type: application/json" \
  -d '{"action":"debug-autopost"}' | python3 -c "
import json, sys
d = json.load(sys.stdin)
diag = d.get('diagnostics', {})
print(f\"Time: {diag.get('timestampUTC')}\")
print(f\"Current CST hour: {diag.get('currentTimeCST')}\")
print(f\"Today feed count: {diag.get('todayFeedCount')}\")
print(f\"Today story count: {diag.get('todayStoryCount')}\")
print(f\"Start of day CST: {diag.get('startOfDayCST')}\")
print(f\"Likely issues: {diag.get('likelyIssues', [])}\")
" 2>&1 | head -15
