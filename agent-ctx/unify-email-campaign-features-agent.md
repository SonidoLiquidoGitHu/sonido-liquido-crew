# Task: Unify Email Campaign Features

## Summary
Unified the email campaign features between `CampaignEmailModal` and `MailchimpCampaignStudio` by adding the missing features to `MailchimpCampaignStudio.tsx`.

## Changes Made (all in `MailchimpCampaignStudio.tsx`)

### 1. Added imports
- `StyleSettingsEditor` from `@/components/admin/StyleSettingsEditor`
- `StyleSettings`, `defaultStyleSettings` from `@/lib/style-config`

### 2. Added font mapping and helpers
- Duplicated `fontMap`, `fontGoogleUrlMap`, `buttonRoundedMap`, and `buildGoogleFontsLink` from `CampaignEmailModal` to support styleSettings-aware preview generation.

### 3. Replaced `generatePreviewHTML` function
- Old version used hardcoded `#ff6b00` colors and no style settings.
- New version accepts `styleSettings` parameter, merges with defaults, and generates HTML using custom colors, fonts, button styles, dark/light mode, etc. — matching `CampaignEmailModal` exactly.

### 4. Added new state variables
- `formStyleSettings` — partial StyleSettings state, initialized from defaults
- `formSendTab` — `"send-now" | "schedule"` tab state
- `formIncludeCoverImage` — boolean toggle for cover image inclusion

### 5. Updated `handleCreateCampaign`
- Now computes `effectiveCoverImageUrl` using the include toggle
- Passes `styleSettings: formStyleSettings` to the API payload
- Schedule time only sent when `formSendTab === "schedule"`
- Form reset now also resets `formStyleSettings`, `formSendTab`, `formIncludeCoverImage`

### 6. Added cover image toggle UI
- URL input + toggle switch to include/exclude cover image
- Image preview when included
- Matches `CampaignEmailModal` toggle pattern

### 7. Added Send Now / Schedule tabs
- Replaced the simple datetime input with tabbed UI ("Enviar ahora" / "Programar")
- Schedule tab shows datetime picker with formatted date preview
- Matches `CampaignEmailModal` tab pattern

### 8. Added StyleSettingsEditor component
- Added in the left column (after Tags selection)
- Uses `formStyleSettings` state
- `showPreview={false}` since the main preview iframe already shows the styled result
- `category="campaign"` for context

### 9. Updated preview modal
- Now passes `styleSettings: formStyleSettings` to `generatePreviewHTML`
- Cover image uses effective URL (respects toggle)
- Updated styling to match dark theme (bg-slc-dark, border-slc-border)

### 10. Updated action buttons
- Send button now shows "Programar Campana" when on schedule tab
- Disabled state includes `formSendTab === "schedule" && !formScheduleTime`

## Verification
- `npx tsc --noEmit` passes with no errors
- Lint has pre-existing config issues unrelated to these changes
