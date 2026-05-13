# Fix: Video & Image Loading Issues (Dropbox URLs)

## Task ID: fix-video-image-loading
## Agent: main
## Date: 2025-03-05

## Diagnosis

### Root Cause 1: Recent vertical videos not loading
**`getVideoThumbnail()`** in `video-utils.ts` returned `video.thumbnailUrl` directly WITHOUT applying `getDirectDropboxUrl()`. This meant:
- DB URLs with `dl.dropboxusercontent.com` (broken for new-format links) were passed through unchanged
- DB URLs with `www.dropbox.com/scl/fi/...` without `?raw=1` would get an HTML page from Dropbox instead of the image
- Even though `SafeImage` proxies Dropbox URLs through `/api/image-proxy`, the proxy received broken `dl.dropboxusercontent.com` URLs that it couldn't resolve

### Root Cause 2: Mobile image loading issues
Mobile browsers (especially iOS Safari) are strict about:
1. **Content-type mismatches** - Dropbox returns `application/json` or `text/html` for media files
2. **Cross-origin restrictions** - Direct Dropbox URLs fail on mobile due to CORS
3. **`<video poster>` and `backgroundImage`** used raw `getVideoThumbnail()` URLs without proxying - these HTML attributes can't benefit from SafeImage's proxy logic
4. **`<video src>`** used `getVideoSrc()` which returns raw Dropbox URLs - mobile browsers can't play these directly

### Secondary Issue
`ArtistReelsSection.tsx` used `video.videoUrl` directly for the inline video preview without `getDirectDropboxUrl()`, causing broken hover previews for Dropbox-hosted videos.

## Files Changed

### 1. `/src/lib/video-utils.ts`
- **`getVideoThumbnail()`**: Now applies `getDirectDropboxUrl()` to `thumbnailUrl` before returning
- **Added `isDropboxUrl()`**: Helper to check if a URL is from Dropbox
- **Added `getProxiedVideoSrc()`**: Routes Dropbox video URLs through `/api/video-proxy` for mobile compatibility
- **Added `getProxiedThumbnailUrl()`**: Routes Dropbox thumbnail URLs through `/api/image-proxy` for use in `poster` and `backgroundImage` attributes

### 2. `/src/app/api/image-proxy/route.ts`
- Added URL normalization at the start of the handler:
  - Converts `dl.dropboxusercontent.com` → `www.dropbox.com?raw=1` (broken CDN host → working shared link format)
  - Adds `?raw=1` to Dropbox URLs missing it
  - Converts `?dl=0` → `?raw=1`
- This ensures even if a broken URL makes it to the proxy, it gets fixed before fetching

### 3. `/src/app/api/video-proxy/route.ts`
- Added same URL normalization at the start of the handler
- Converts broken `dl.dropboxusercontent.com` URLs before trying Dropbox API resolution

### 4. `/src/app/(public)/reels/ReelsGrid.tsx`
- Changed `getVideoSrc()` → `getProxiedVideoSrc()` for the fullscreen `<video>` element
- Added `poster={posterUrl}` using `getProxiedThumbnailUrl()` for mobile poster frame

### 5. `/src/components/public/sections/TikTokFeed.tsx`
- Changed `getVideoSrc()` → `getProxiedVideoSrc()` in VideoPlayer component
- Added `poster={posterUrl}` using `getProxiedThumbnailUrl()`
- Changed `backgroundImage` in loading blur to use `getProxiedThumbnailUrl()` instead of raw `getVideoThumbnail()`
- Changed YouTubePlayer's `backgroundImage` to use `getProxiedThumbnailUrl()`

### 6. `/src/app/(public)/reels/[id]/ReelDetail.tsx`
- Changed `getVideoSrc()` → `getProxiedVideoSrc()` for the `<video>` element
- Changed `poster` from `getVideoThumbnail()` → `getProxiedThumbnailUrl()`

### 7. `/src/components/public/sections/ArtistReelsSection.tsx`
- Added `getDirectDropboxUrl` import
- Applied `getDirectDropboxUrl(video.videoUrl)` to inline video preview `src`

### 8. `/src/app/(public)/reels/[id]/page.tsx`
- Added `getDirectDropboxUrl` import
- Applied `getDirectDropboxUrl()` to OG metadata thumbnail URL

## How the Fix Chain Works

For a video with a `dl.dropboxusercontent.com` thumbnail URL:

1. **Before fix**: `getVideoThumbnail()` returned `dl.dropboxusercontent.com/...` → SafeImage proxied to `/api/image-proxy?url=dl.dropboxusercontent.com/...` → proxy fetched broken URL → 502 error

2. **After fix**: `getVideoThumbnail()` applies `getDirectDropboxUrl()` → returns `www.dropbox.com/...?raw=1` → SafeImage proxied to `/api/image-proxy?url=www.dropbox.com/...?raw=1` → proxy fetches working URL → image loads

For a video `<video>` element with a Dropbox URL:

1. **Before fix**: `<video src="www.dropbox.com/...?raw=1">` → mobile browser fails (CORS, content-type) → video doesn't play

2. **After fix**: `<video src="/api/video-proxy?url=www.dropbox.com/...?raw=1" poster="/api/image-proxy?url=...">` → server fetches, fixes content-type, re-serves with proper headers → video plays on all devices
