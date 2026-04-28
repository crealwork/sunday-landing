# Realtor Onboarding — Direct Multi-File Upload

**Date**: 2026-04-27
**Scope**: Replace Google Drive link sharing with direct upload to Vercel Blob for headshots, logos, and brand assets. Keep Drive link as fallback for big brand folders.

---

## Problem

Realtors struggle to share Google Drive links. Three failure modes recur:
1. They don't know how to set "Anyone with the link can view" sharing.
2. Their brokerage GSuite admin blocks external sharing entirely.
3. They confuse "share" with "preview" URLs and submit the wrong one.

Result: we email back asking for permissions, lose 1-2 days, sometimes lose the lead. Drive itself isn't broken — link sharing as the *only* path is the friction.

## Solution Summary

Add direct file upload via the form. Files go to a Vercel Blob store we own, so permissions are zero-config from the realtor's side. Multi-file per slot (some realtors have 3-5 headshot variants). Brand assets keep a Drive link option as alternative for very large folders.

Optimistic upload — file uploads start the moment they're picked, finishing in the background while the realtor fills in other fields. Submit is fast.

---

## 1. Slots and Limits

| Slot | Required? | Max files | Max per file | Allowed types |
|---|---|---|---|---|
| Headshot | ✅ ≥1 required | 5 | 10 MB | image/jpeg, image/png, image/webp, image/heic, image/heif |
| Logo | optional | 3 | 10 MB | image/* + image/svg+xml + application/pdf |
| Brand assets | optional (XOR with Drive link) | 10 | 10 MB | image/* + svg + pdf + application/zip |

Brand assets keeps **Drive link as alternative** — fonts in zips, AI/PSD originals, and large kits remain easier as a folder share.

Per-submission worst case: 5 × 10 + 3 × 10 + 10 × 10 = 180 MB (extreme outlier). Realistic: ~25 MB.

## 2. UX (inside Step 4 of the form)

```
┌─────────────────────────────────────────────┐
│ Headshot(s) *                               │
│ ┌─────────────────────────────────────────┐ │
│ │  📷  Drop here or click to browse        │ │
│ │      JPG/PNG/HEIC · up to 5 files       │ │
│ └─────────────────────────────────────────┘ │
│ ✓ jane-headshot-01.jpg  (2.3 MB)        ×  │
│ ✓ jane-headshot-02.jpg  (3.1 MB)        ×  │
│ ⏳ jane-headshot-03.jpg  uploading 60%      │
└─────────────────────────────────────────────┘
```

Behavior:
- Drag-and-drop **and** click-to-browse both supported.
- **Optimistic upload**: file starts uploading the moment it's picked; user keeps filling form.
- Each file row shows: ✓ done / ⏳ progress / ✗ failed (+ retry).
- × removes a file (also deletes from Blob if upload finished, best-effort — orphans are cheap).
- "Continue" button blocked when any upload is in flight; shows "Uploads in progress…" message.

**For brand slot**, add toggle:
```
○ Upload files
○ Or share a Google Drive folder link
```
Choosing one hides the other. Default to Upload.

## 3. Backend — Vercel Blob

### 3a. Upload endpoint

`/api/upload.js` (Edge Runtime):

```js
import { put } from '@vercel/blob';

export const config = { runtime: 'edge' };

const SLOTS = new Set(['headshot', 'logo', 'brand']);
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_HOSTS = ['sundayable.com', 'www.sundayable.com', 'localhost'];

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Cheap abuse protection: only accept POSTs from our own site.
  const ref = req.headers.get('referer') || req.headers.get('origin') || '';
  if (!ALLOWED_HOSTS.some(h => ref.includes(h))) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const slot = String(form.get('slot') || '');
  const sessionId = String(form.get('sessionId') || '');

  if (!file || typeof file === 'string') return jsonError('Missing file', 400);
  if (!SLOTS.has(slot)) return jsonError('Invalid slot', 400);
  if (!/^[a-f0-9-]{36}$/.test(sessionId)) return jsonError('Invalid sessionId', 400);
  if (file.size > MAX_BYTES) return jsonError('File too large (max 10MB)', 413);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const path = `realtor-onboarding/${sessionId}/${slot}-${Date.now()}-${safeName}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: file.type || 'application/octet-stream',
  });

  return Response.json({
    url: blob.url,
    name: file.name,
    size: file.size,
    type: file.type,
    slot,
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
```

### 3b. (Optional) Delete endpoint

`/api/upload-delete.js`:
- POST with `{ url, sessionId }`
- Verifies URL contains `realtor-onboarding/<sessionId>/` (prevents deleting other people's files)
- Calls `del(url)` from `@vercel/blob`
- Used when user clicks × on a completed upload

### 3c. Storage layout

```
realtor-onboarding/
  <session-uuid>/
    headshot-1714250000-jane-headshot.jpg
    headshot-1714250012-jane-second.jpg
    logo-1714250045-logo-wordmark.svg
    brand-1714250089-style-guide.pdf
```

UUID ties one form submission's files together — useful for Sunday team to download the whole bundle when starting a build.

## 4. Frontend — Upload Widget (vanilla JS, inline)

State (module-level so it survives step navigation):

```js
var UPLOAD_STATE = {
  sessionId: crypto.randomUUID(),
  headshot: [],  // array of { url, name, size, type, status: 'done'|'uploading'|'failed', tempId }
  logo: [],
  brand: [],
};
```

Key functions:
- `addFiles(slot, FileList)` — validates each file, creates temp row with status='uploading', calls `uploadFile()`
- `uploadFile(slot, file, tempId)` — POSTs to `/api/upload`, updates status on response
- `removeFile(slot, tempId)` — removes from state, fires delete API call (best-effort)
- `renderSlot(slot)` — re-renders the file list UI for one slot
- `hasInflightUploads()` — returns true if any slot has files with status='uploading'

Validation (for Step 4 → Step 5):
- `headshot.length >= 1` (at least one with status='done')
- `!hasInflightUploads()` (or show message)
- For brand slot: if "upload" mode, no constraint; if "Drive link" mode, optional URL

Submit payload (replaces existing `headshotLink`, `brandDriveLink`):

```js
data.headshotFiles = JSON.stringify(UPLOAD_STATE.headshot.filter(f => f.status==='done').map(f => ({url:f.url, name:f.name, size:f.size})));
data.logoFiles = JSON.stringify(UPLOAD_STATE.logo.filter(f => f.status==='done').map(f => ({url:f.url, name:f.name, size:f.size})));
data.brandFiles = JSON.stringify(UPLOAD_STATE.brand.filter(f => f.status==='done').map(f => ({url:f.url, name:f.name, size:f.size})));
data.brandDriveLink = (current Drive input value);  // kept for fallback
data.uploadSessionId = UPLOAD_STATE.sessionId;
```

JSON-stringified arrays land in Apps Script as strings, which `JSON.parse` cleanly on the server side.

## 5. Apps Script Updates

### 5a. New ONBOARDING_COLUMNS (appended at end)

```js
'Headshot URLs', 'Logo URLs', 'Brand Asset URLs', 'Upload Session ID'
```

**Existing column policy:**
- `Headshot Drive Link` — stays in schema, but **always empty** for new submissions (headshot is upload-only). Preserved for old rows.
- `Brand Drive Link` — **still active**. Populated when realtor uses the "share a Drive folder" toggle for brand assets. Empty when they upload files instead. This is XOR with `Brand Asset URLs`.

The frontend payload sends `brandDriveLink: ''` if the realtor chose upload mode, and `brandFiles: '[]'` if they chose Drive mode. Apps Script writes both — one will be empty, the other populated.

### 5b. `saveOnboardingToSheet`

Parse JSON arrays, store as newline-joined URL list per cell (Sheet-friendly):

```js
function urlList(jsonStr) {
  try {
    var arr = JSON.parse(jsonStr || '[]');
    return arr.map(function(f) { return f.url; }).join('\n');
  } catch (e) { return ''; }
}
// in appendRow array:
urlList(data.headshotFiles),
urlList(data.logoFiles),
urlList(data.brandFiles),
data.uploadSessionId || '',
```

### 5c. `buildOnboardingEmailHtml`

Add a new "Uploaded files" section near the top (after Brokerage Address). Render each file as a clickable link with name + size:

```
Uploaded files
─────────────
Headshot (2):
  • jane-headshot-01.jpg (2.3 MB)
  • jane-headshot-02.jpg (3.1 MB)
Logo (1):
  • logo-wordmark.svg (12 KB)
Brand (0):
  (none)
```

### 5d. `buildClaudePromptForBuild`

Replace the existing `## Headshot` and `## Brand` sections:

```js
'## Headshot',
fileList(data.headshotFiles, '- '),
'',
'## Logo',
fileList(data.logoFiles, '- '),
'',
'## Brand assets',
fileList(data.brandFiles, '- '),
data.brandDriveLink ? '- Drive folder: ' + data.brandDriveLink : '',
```

`fileList()` helper joins URLs from the JSON array, one per line.

This way Claude sees direct URLs it can `fetch` without permission gymnastics.

## 6. Setup Steps (One-Time)

1. **Vercel dashboard** → `sunday-landing` project → Storage tab → Create Database → **Blob** → name `sunday-onboarding-uploads`. This auto-injects `BLOB_READ_WRITE_TOKEN` into the project's env vars.
2. Add `package.json` to repo root:
   ```json
   {
     "name": "sunday-landing",
     "version": "1.0.0",
     "private": true,
     "dependencies": { "@vercel/blob": "^0.27.0" }
   }
   ```
3. Add `/api/upload.js` (and optional `/api/upload-delete.js`).
4. Update form HTML with widget + state + submit changes.
5. Update `Code.js` (also `google-apps-script.js` mirror) with new columns + email + prompt.
6. Commit + push (Vercel auto-deploys frontend + functions). Run `clasp push && clasp deploy --deploymentId <existing>` for Apps Script.

## 7. Cost

- Free Hobby tier: 5 GB storage / 1 GB bandwidth / month.
- Realistic monthly: 50 onboardings × ~25 MB = 1.25 GB stored / month, ~50 MB bandwidth (each file downloaded once or twice during build).
- Free for ~4 months even with linear growth. Pro plan ($20/mo) gives 100 GB if needed later.

## 8. Edge Cases

- **iOS HEIC**: stored as-is. Image processing during site build (Sharp/ImageMagick) handles HEIC fine.
- **Upload mid-flight when user clicks Submit**: blocked at "Continue" button on Step 4. By Step 5 (Submit step) all uploads are done.
- **Upload fails**: row shows ✗ + Retry button. After 2 failed retries, show inline note "Or email files to hello@sundayable.com".
- **User abandons form mid-upload**: orphan files in Blob. Negligible cost. Add 7-day cleanup cron later if volume grows.
- **Same filename twice in one slot**: unique `Date.now()` prefix in Blob path prevents collision.
- **Page refresh during form**: UPLOAD_STATE is in memory only. Realtor must re-upload. Acceptable — they're filling a 5-min form.
- **Refer header missing or spoofed**: 403 returned. Not a strong defense (referer can be forged), but blocks 99% of casual abuse. Real defense is Vercel function rate limits.

## 9. Out of Scope

- Cropping / image editing in browser
- Server-side image compression / format conversion
- User accounts / login
- 7-day orphan cleanup cron (defer)
- Multi-step "drag a folder" — folders go via Drive link

## 10. File Touchpoints

```
sunday-landing/
├── api/
│   └── upload.js                  # NEW — Edge function for direct file upload
├── package.json                   # NEW — declares @vercel/blob dependency
├── Code.js                        # ONBOARDING_COLUMNS + appendRow + email + Claude prompt
├── google-apps-script.js          # mirror of Code.js (same edits)
└── realtor-site-onboarding/
    ├── index.html                 # Step 4 widget, UPLOAD_STATE, validation, submit payload
    └── DESIGN-direct-upload.md    # this spec
```

## 11. Verification (Post-Deploy)

1. Open `/realtor-site-onboarding/` in incognito. Reach Step 4. Drag 2 headshot files → both upload, show ✓ and thumbnails.
2. Click × on one file → row removes; refresh-then-back-button → state lost (expected).
3. Try a 15 MB file → 413 error shown inline ("File too large").
4. Try uploading from a non-sundayable.com referer (e.g. localhost on a different port without our domain in URL) → 403 (or success on localhost since we whitelist it).
5. Submit form → Sheet has 4 new columns populated with newline-joined URLs + sessionId. Notification email shows file links. Claude prompt block in email has direct URLs under `## Headshot` etc.
6. Click a URL from the Sheet → file opens in browser (public access). Confirms permissions are zero-config.

---

## Why This Plan

Drive link sharing creates 3-step friction (upload → permissions → URL copy) that breaks for ~30% of realtors based on Sunday's experience. Direct upload eliminates that path entirely while preserving Drive as escape hatch for big brand folders.

Vercel Blob is a 1-day add (one function, one env var, one widget) using the same Vercel project we already deploy to — no new vendor relationship, no new domain, no new auth surface. Cost is free for years at projected volume.
