# Realtor Onboarding — Multi-Province Support

**Date**: 2026-04-26
**Scope**: BC + Alberta + Ontario
**Goal**: Open `/realtor-site-onboarding/` form to AB and ON realtors without losing BC trust signals.

---

## Problem

Current form is BC-only (BCFSA license label, 604 phone, Vancouver examples, "for BC realtors" meta). AB/ON realtors landing on it bounce because nothing speaks to them, and the data we capture lacks province context — required for footer compliance and routing during site builds.

## Solution Summary

Add a **province selector** at the top of Step 1. On selection, dynamically swap labels, placeholders, and error messages to match the chosen regulator. Store `province` + `regulator` in the form payload, Sheet, notification email, and Claude build prompt.

Frontend `PROVINCE_CONFIG` is the single source of truth — backend is dumb passthrough. Adding a 4th province later = one config block in `index.html`.

---

## 1. Province Selector — UX

**Location**: Step 1, above `Full name` (very first field).

**Component**: Chip radio group using existing `.chip` styles.

```html
<label>Where are you licensed? *</label>
<div class="chip-group">
  <span class="chip"><input type="radio" id="prov-bc" name="province" value="BC"><label for="prov-bc">British Columbia</label></span>
  <span class="chip"><input type="radio" id="prov-ab" name="province" value="AB"><label for="prov-ab">Alberta</label></span>
  <span class="chip"><input type="radio" id="prov-on" name="province" value="ON"><label for="prov-on">Ontario</label></span>
</div>
```

**Required**. No default selection.

---

## 2. Default (Pre-Selection) State

Before province is selected, all province-specific text uses **neutral fallbacks**. This removes BC bias for AB/ON visitors and creates a clear "pick first, then fill" UX.

| Field | Neutral default |
|---|---|
| Phone placeholder | `Your cell number` |
| License label | `License/registration number *` |
| License placeholder | `Your license/registration number` |
| License error | `Please enter your license/registration number.` |
| License help text | `If you don't have it handy, type "TBD" and email it to hello@sundayable.com later.` (unchanged — no province ref) |
| Compliance note (under brokerage address) | `Required for footer compliance.` |
| Brokerage name placeholder | `e.g. your brokerage name` |
| Brokerage address placeholder | `e.g. 1000 Main St, City, Province, Postal Code` |
| Service areas placeholder | `Where you actively work` |
| Testimonial 1 city | `e.g. Jamie L., your city` |

---

## 3. PROVINCE_CONFIG (Source of Truth)

```js
const PROVINCE_CONFIG = {
  BC: {
    regulator: 'BCFSA',
    licenseLabel: 'BCFSA license number',
    licensePlaceholder: 'e.g. RE123456',
    licenseError: 'Please enter your BCFSA license number.',
    complianceNote: 'Required for footer compliance (BCFSA).',
    phonePlaceholder: '604-555-0123',
    brokerageNamePlaceholder: 'e.g. Westcoast Premier Realty',
    brokerageAddressPlaceholder: 'e.g. 1000 Example Blvd, Vancouver, BC V6B 0A0',
    areasPlaceholder: 'e.g. Vancouver West, Burnaby Brentwood, Coquitlam, North Vancouver',
    testimonialCityExample: 'e.g. Jamie L., Coquitlam',
  },
  AB: {
    regulator: 'RECA',
    licenseLabel: 'RECA licence number', // NOTE: Canadian spelling — RECA uses "licence"
    licensePlaceholder: 'e.g. 1234567',
    licenseError: 'Please enter your RECA licence number.',
    complianceNote: 'Required for footer compliance (RECA).',
    phonePlaceholder: '403-555-0123',
    brokerageNamePlaceholder: 'e.g. Foothills Premier Realty',
    brokerageAddressPlaceholder: 'e.g. 1000 Example St SW, Calgary, AB T2P 0A0',
    areasPlaceholder: 'e.g. Beltline, Mission, Inglewood, Bridgeland',
    testimonialCityExample: 'e.g. Jamie L., Calgary',
  },
  ON: {
    regulator: 'RECO',
    licenseLabel: 'RECO registration number',
    licensePlaceholder: 'e.g. 1234567',
    licenseError: 'Please enter your RECO registration number.',
    complianceNote: 'Required for footer compliance (RECO).',
    phonePlaceholder: '416-555-0123',
    brokerageNamePlaceholder: 'e.g. Lakeshore Premier Realty',
    brokerageAddressPlaceholder: 'e.g. 1000 Example St, Toronto, ON M5H 0A0',
    areasPlaceholder: 'e.g. Yorkville, Liberty Village, Leaside, The Beaches',
    testimonialCityExample: 'e.g. Jamie L., Etobicoke',
  },
};
```

> **Verification (done 2026-04-26)**: Confirmed via RECA + RECO official sites. RECA uses Canadian "**licence**" spelling and "Licensee Search" tool branding → "RECA licence number". RECO uses "registration number" and refers to professionals as "registrants" → "RECO registration number". BC keeps existing "license" (American) spelling that's already on the form. Format/digit length not published by either regulator — placeholders show typical 7-digit example.

---

## 4. JS — `updateProvinceFields(province)`

Triggered on province radio change. Updates DOM:

```js
function updateProvinceFields(province) {
  const cfg = PROVINCE_CONFIG[province];
  if (!cfg) return;

  document.getElementById('cell').placeholder = cfg.phonePlaceholder;
  document.getElementById('brokerageName').placeholder = cfg.brokerageNamePlaceholder;
  document.getElementById('brokerageAddress').placeholder = cfg.brokerageAddressPlaceholder;

  // license group
  document.querySelector('label[for="licenseNumber"]').firstChild.textContent = cfg.licenseLabel + ' ';
  document.getElementById('licenseNumber').placeholder = cfg.licensePlaceholder;
  document.getElementById('err-licenseNumber').textContent = cfg.licenseError;

  // brokerage compliance note
  document.getElementById('brokerageComplianceNote').textContent = cfg.complianceNote;

  document.getElementById('areas').placeholder = cfg.areasPlaceholder;
  document.getElementById('testimonial1Name').placeholder = cfg.testimonialCityExample;
}
```

Wire on every province radio's `change` event.

> Note: The compliance note `<p>` currently has no ID — add `id="brokerageComplianceNote"` to enable selector.

---

## 5. Validation

`validateStep(1)` adds:

```js
var province = document.querySelector('input[name="province"]:checked');
if (!province) { showError('province', 'Please select your province.'); valid = false; }
else clearError('province');
```

Error span `<p class="error-msg" id="err-province">Please select your province.</p>` placed under the province chip group.

---

## 6. submitForm() Payload

Two new fields:

```js
var provinceSel = document.querySelector('input[name="province"]:checked');
var province = provinceSel ? provinceSel.value : '';
var regulator = (PROVINCE_CONFIG[province] || {}).regulator || '';

var data = {
  // ...existing fields,
  province: province,
  regulator: regulator,
  // ...UTMs,
};
```

---

## 7. Apps Script Updates (`google-apps-script.js`)

### 7a. `ONBOARDING_COLUMNS`

**Append `Province` and `Regulator` at the very end** (after `Landing Referrer`). The migration logic at line 356-358 only appends new columns to the right — inserting in the middle would misalign existing data rows.

```js
var ONBOARDING_COLUMNS = [
  'Timestamp', 'Name', 'Email', 'Cell',
  'Brokerage Name', 'Brokerage Address', 'License Number',
  'Areas', 'Social Media',
  'Specialty', 'Voice', 'Presale Projects', 'Wants Listings Search',
  'Has Testimonials', 'Testimonials',
  'Has Domain', 'Domain URL', 'Has Brand', 'Brand Drive Link', 'Fav Sites', 'Mood Word',
  'Headshot Drive Link', 'Languages', 'Avoid Note',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term',
  'Landing URL', 'Landing Referrer',
  'Province', 'Regulator', // <-- new
];
```

### 7b. `saveOnboardingToSheet`

Append `data.province || ''` and `data.regulator || ''` to the `appendRow` array, in same position.

### 7c. `buildOnboardingEmailHtml`

Add two rows in the data table (visually near the top, but the **Sheet column order** is unchanged — visual order in email is independent):

```js
+ row('Province', data.province)
+ row('Regulator', data.regulator)
```

Place both rows immediately after `row('Cell', data.cell)` so Province + Regulator sit at the top of the data table for quick scan.

### 7d. `buildClaudePromptForBuild` — CRITICAL

Two changes:

**Identity section**: replace hardcoded `'- BCFSA license #: ' + (data.licenseNumber || ''),` with regulator-aware version. Use `regulator` + `#` (skip the word "license" because RECO registrants don't use that term):

```js
'- ' + (data.regulator || 'Real estate license') + ' #: ' + (data.licenseNumber || ''),
'- Province: ' + (data.province || '—'),
```

Outputs: `- BCFSA #: RE123456` / `- RECA #: 1234567` / `- RECO #: 1234567`.

**Workflow step 6** mentions DESIGN.md — no change needed (province affects only the footer compliance text, which the build phase reads from the brief data, not from this prompt template).

### 7e. `sendTestPromptEmail` sample data

Add:
```js
province: 'BC',
regulator: 'BCFSA',
```

### 7f. Deploy steps

1. `clasp push` (or paste into editor)
2. `clasp deploy --deploymentId <existing>` to bump in-place (Apps Script URL stays same — see `feedback_clasp_deploy_update.md`)
3. Run `seedOnboardingHeaders()` once to add new headers to existing sheet (the migration auto-extends, but `seedOnboardingHeaders` ensures bold formatting matches)

---

## 8. Form Header / Meta Updates

Three meta tags + page title — change "for BC realtors" → "for realtors in BC, Alberta, and Ontario":

| Tag | Current | New |
|---|---|---|
| `<meta name="description">` | `Designed by Sunday for BC realtors.` | `Designed by Sunday for realtors in BC, Alberta, and Ontario.` |
| `<meta property="og:description">` | `Tell us about you in 8 minutes...` (no province) | unchanged |
| `<meta name="twitter:description">` | (no province) | unchanged |

Only the `description` meta needs the change. OG/Twitter descriptions don't currently mention province.

> The form's main `<h1>` ("Let's build your site.") and hero subcopy ("Five short steps...") are already province-neutral — no change needed there.

---

## 9. Out of Scope (Explicit)

- 4th+ province (MB/SK/QC/NS) — defer until demand. Adding later = one `PROVINCE_CONFIG` entry.
- Auto-detect province from IP/geo — not done. User picks explicitly.
- Per-province pricing or feature differences — none.
- Translating form to French (QC) — not now.

---

## 10. File Touchpoints

```
sunday-landing/
├── realtor-site-onboarding/
│   └── index.html            # province selector, PROVINCE_CONFIG, validation, submit payload
└── google-apps-script.js     # ONBOARDING_COLUMNS, saveOnboardingToSheet, buildOnboardingEmailHtml, buildClaudePromptForBuild, sendTestPromptEmail
```

Plus: deploy Apps Script with `clasp deploy --deploymentId <existing>`, run `seedOnboardingHeaders()` once.

---

## 11. Verification (Post-Deploy)

1. Open `/realtor-site-onboarding/` in incognito → confirm placeholders are neutral on load.
2. Click each province → confirm 9 fields swap correctly (phone, license label/placeholder/error, compliance note, brokerage name/address, areas, testimonial city).
3. Submit one test entry per province → confirm Sheet has new `Province` + `Regulator` columns populated.
4. Confirm notification email shows Province + Regulator rows + the Claude prompt block has `BCFSA license #:` / `RECA license #:` / `RECO registration #:` per submission.
5. Run `clasp run sendTestPromptEmail` after updating sample data → review rendered email.
