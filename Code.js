/**
 * Sunday Waitlist — Google Apps Script
 *
 * 1. Save form data to Google Sheet
 * 2. Send HTML email notification to dan@sundayable.com & dave@sundayable.com
 *
 * SETUP:
 * 1. Go to https://script.google.com and open the existing script
 *    (linked to the current Google Sheet)
 * 2. Replace the entire Code.gs with this code
 * 3. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the new deployment URL and update GOOGLE_SCRIPT_URL in index.html
 */

var SPREADSHEET_ID = '13Ay3qZXzNvffmKq6Lywj_Q762NNKaBAxVPEmep449pg';
var SHEET_NAME = 'Leads';
var ONBOARDING_SHEET_NAME = 'RealtorOnboarding'; // formType: realtor-site-onboarding
var NOTIFY_EMAILS = ['dan@sundayable.com', 'dave@sundayable.com'];

var COLUMNS = [
  'Timestamp', 'Name', 'Brokerage', 'Phone', 'Email', 'Referred By',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term',
  'Landing URL', 'Landing Referrer'
];

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
  'Province', 'Regulator',
  'Headshot URLs', 'Logo URLs', 'Brand Asset URLs', 'Upload Session ID'
];

/**
 * Parse a JSON-stringified array of {url, name, size} into a newline-joined
 * list of URLs for sheet display. Returns empty string on parse failure.
 */
function urlListString(jsonStr) {
  try {
    var arr = JSON.parse(jsonStr || '[]');
    if (!Array.isArray(arr)) return '';
    return arr.map(function(f) { return f && f.url ? f.url : ''; }).filter(Boolean).join('\n');
  } catch (e) {
    return '';
  }
}

/**
 * Same as urlListString but returns the parsed array, for richer rendering
 * (e.g. with file names + sizes in the notification email).
 */
function parseFileArray(jsonStr) {
  try {
    var arr = JSON.parse(jsonStr || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Route by formType
    if (data.formType === 'realtor-site-onboarding') {
      saveOnboardingToSheet(data);
      sendOnboardingNotification(data);
    } else {
      // Default: existing waitlist flow
      saveToSheet(data);
      sendNotification(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveToSheet(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
  } else {
    // Migration: if headers are missing the UTM columns, extend them in-place
    var lastCol = sheet.getLastColumn();
    if (lastCol < COLUMNS.length) {
      var existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      var newHeaders = COLUMNS.slice(lastCol);
      sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
    }
  }

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name || '',
    data.company || '',
    data.phone || '',
    data.email || '',
    data.referred_by || '',
    data.utm_source || '',
    data.utm_medium || '',
    data.utm_campaign || '',
    data.utm_content || '',
    data.utm_term || '',
    data.landing_url || '',
    data.landing_referrer || ''
  ]);
}

function sendNotification(data) {
  var subject = '🟣 Sunday waitlist — ' + (data.name || 'Unknown');

  var html = buildEmailHtml(data);

  NOTIFY_EMAILS.forEach(function(email) {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: html,
      name: 'Sunday Waitlist',
      replyTo: data.email || ''
    });
  });
}

function buildEmailHtml(data) {
  var timestamp = data.timestamp
    ? new Date(data.timestamp).toLocaleString('en-US', { timeZone: 'America/Vancouver', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver', dateStyle: 'medium', timeStyle: 'short' });

  return '<!DOCTYPE html>'
    + '<html><head><meta charset="utf-8"></head>'
    + '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">'
    + '<tr><td align="center">'
    + '<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">'

    // Header
    + '<tr><td style="background:#0A0A0A;padding:32px 40px;text-align:center;">'
    + '<p style="margin:0;font-family:Georgia,serif;font-size:28px;color:#ffffff;letter-spacing:0.5px;">Sunday.</p>'
    + '</td></tr>'

    // Badge
    + '<tr><td style="padding:32px 40px 0;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + '<td style="background:#800020;color:#ffffff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">NEW SIGNUP</td>'
    + '</tr></table>'
    + '</td></tr>'

    // Title
    + '<tr><td style="padding:16px 40px 0;">'
    + '<p style="margin:0;font-size:22px;font-weight:700;color:#0A0A0A;">' + escapeHtml(data.name || 'Unknown') + '</p>'
    + '<p style="margin:4px 0 0;font-size:14px;color:#6B6B6B;">' + escapeHtml(data.company || 'No brokerage') + '</p>'
    + '</td></tr>'

    // Divider
    + '<tr><td style="padding:24px 40px 0;">'
    + '<div style="border-top:1px solid #E5E5E5;"></div>'
    + '</td></tr>'

    // Details
    + '<tr><td style="padding:24px 40px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0">'

    + '<tr>'
    + '<td style="padding:8px 0;vertical-align:top;">'
    + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">Phone</p>'
    + '</td>'
    + '<td style="padding:8px 0;text-align:right;">'
    + '<a href="tel:' + escapeHtml(data.phone || '') + '" style="margin:0;font-size:15px;color:#0A0A0A;font-weight:500;text-decoration:none;">' + escapeHtml(data.phone || '—') + '</a>'
    + '</td>'
    + '</tr>'

    + '<tr>'
    + '<td style="padding:8px 0;vertical-align:top;">'
    + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">Email</p>'
    + '</td>'
    + '<td style="padding:8px 0;text-align:right;">'
    + '<a href="mailto:' + escapeHtml(data.email || '') + '" style="margin:0;font-size:15px;color:#0A0A0A;font-weight:500;text-decoration:none;">' + escapeHtml(data.email || '—') + '</a>'
    + '</td>'
    + '</tr>'

    + '<tr>'
    + '<td style="padding:8px 0;vertical-align:top;">'
    + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">Referred By</p>'
    + '</td>'
    + '<td style="padding:8px 0;text-align:right;">'
    + '<p style="margin:0;font-size:15px;color:#0A0A0A;font-weight:500;">' + escapeHtml(data.referred_by || 'Direct') + '</p>'
    + '</td>'
    + '</tr>'

    + (data.utm_source || data.utm_campaign ? buildUtmRow(data) : '')

    + '<tr>'
    + '<td style="padding:8px 0;vertical-align:top;">'
    + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">Submitted</p>'
    + '</td>'
    + '<td style="padding:8px 0;text-align:right;">'
    + '<p style="margin:0;font-size:15px;color:#0A0A0A;font-weight:500;">' + timestamp + '</p>'
    + '</td>'
    + '</tr>'

    + '</table>'
    + '</td></tr>'

    // CTA
    + '<tr><td style="padding:28px 40px;">'
    + '<a href="mailto:' + escapeHtml(data.email || '') + '?subject=' + encodeURIComponent('Welcome to Sunday — ' + (data.name || '').split(' ')[0]) + '" '
    + 'style="display:inline-block;background:#0A0A0A;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">Reply to ' + escapeHtml((data.name || 'Lead').split(' ')[0]) + '</a>'
    + '</td></tr>'

    // Footer
    + '<tr><td style="background:#f5f5f5;padding:20px 40px;text-align:center;">'
    + '<p style="margin:0;font-size:12px;color:#6B6B6B;">sundayable.com</p>'
    + '</td></tr>'

    + '</table>'
    + '</td></tr></table>'
    + '</body></html>';
}

function buildUtmRow(data) {
  var parts = [];
  if (data.utm_campaign) parts.push('<strong style="color:#800020;">' + escapeHtml(data.utm_campaign) + '</strong>');
  var smt = [];
  if (data.utm_source) smt.push(escapeHtml(data.utm_source));
  if (data.utm_medium) smt.push(escapeHtml(data.utm_medium));
  if (data.utm_content) smt.push(escapeHtml(data.utm_content));
  if (smt.length) parts.push('<span style="color:#6B6B6B;">' + smt.join(' / ') + '</span>');
  return '<tr>'
    + '<td style="padding:8px 0;vertical-align:top;">'
    + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">Campaign</p>'
    + '</td>'
    + '<td style="padding:8px 0;text-align:right;">'
    + '<p style="margin:0;font-size:14px;color:#0A0A0A;font-weight:500;line-height:1.4;">' + parts.join('<br>') + '</p>'
    + '</td>'
    + '</tr>';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[®*]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-(prec|realtor)(-|$)/g, '$2')
    .substring(0, 40)
    .replace(/-+$/, '');
}

/**
 * Build a Claude-ready prompt + structured brief.
 * Dan copy-pastes the entire thing into a fresh Claude session
 * to kick off the realtor-site build.
 */
function buildClaudePromptForBuild(data) {
  var slug = slugify(data.name) || 'new-realtor';
  var hasBrandAssets = data.hasBrand === 'Yes';

  function fileListBlock(prefix, jsonStr) {
    var arr = parseFileArray(jsonStr);
    if (!arr.length) return '';
    return arr.map(function(f) { return prefix + (f.url || '') + ' (' + (f.name || 'file') + ')'; }).join('\n');
  }

  var headshotFilesText = fileListBlock('- ', data.headshotFiles);
  var logoFilesText = fileListBlock('- ', data.logoFiles);
  var brandFilesText = fileListBlock('- ', data.brandFiles);

  var brand;
  if (hasBrandAssets) {
    if (brandFilesText) {
      brand = '- Uploaded brand files (download via HTTPS):\n' + brandFilesText;
    } else if (data.brandDriveLink) {
      brand = '- Brand Drive folder: ' + data.brandDriveLink;
    } else {
      brand = '- (Realtor selected "has brand" but no files or link provided — email them to follow up.)';
    }
  } else {
    brand = '- No existing brand\n- Mood word: ' + (data.moodWord || '—') + '\n- Reference sites: ' + (data.favSites || '—');
  }

  return [
    "I'm building a new realtor website. Use the existing tooling:",
    '',
    '- Scaffold: `tools/realtor-site-starter/`',
    '- Brainstorm skill (MANDATORY — Q1-Q9 covers mood+density, archetype+anchor, hero, typography, motion, photography, specialty page, personal logo): `realtor-site-brainstorm`',
    '- Diversity registry (READ before brainstorm, WRITE after): `clients/_archetype-registry.md` — prevents accidental clones of prior realtor combos',
    '- Playbook (gotchas — gpt-image-2, CSS, Vercel, estimator UX): `tools/realtor-site-starter/PLAYBOOK.md`',
    '- Output dir: `clients/' + slug + '/website/`',
    '- Reference patterns (component reuse ONLY — DO NOT copy section composition):',
    '  - `clients/chloe-choi/homesweetchloe/` → archetype A (Magazine), T1 (Fraunces+Inter), M2',
    '  - `clients/hacey-jeong/website/` → archetype B (Fashion-Retail Editorial), T4 (Cormorant Garamond+Manrope), M2',
    '- Memory to read: `feedback_realtor_site_workflow.md`, `feedback_realtor_layout_diversity.md`, `feedback_realtor_color_portraits.md`, `feedback_realtor_value_page_pattern.md`, `feedback_realtor_playbook_variant.md`, `feedback_realtor_seo_checklist.md`',
    '',
    'Workflow:',
    '1. Clone the starter to `clients/' + slug + '/website/`.',
    '2. **Inputs analysis — BEFORE brainstorm.** This is what makes the build fit the realtor\'s actual taste, not generic AI defaults.',
    '   - If `Reference sites` (favSites) provided: crawl EACH URL with Firecrawl. Extract: dominant CSS colors (hex), `font-family` declarations, layout pattern (grid / full-bleed / long-form / bento / catalog), navigation style, density (sparse/medium/dense), motion mode if visible. Map findings to archetype candidates (A-L) + typography candidates (T1-T10). These become PRE-FILLED suggestions for Q1-Q5.',
    '   - If `Headshot` URLs provided: download all via HTTPS (curl/fetch, public Vercel Blob URLs — no auth). Copy the first one to `scripts/headshot-source.jpg`. Keep the rest as alternates in `clients/' + slug + '/headshots/`.',
    '   - If `Logo` URLs provided: download via HTTPS. Extract dominant + accent hex with PIL — these become DESIGN.md color anchors.',
    '   - If `Brand` uploaded files provided: download all via HTTPS. Brand guidelines PDF → parse for color/font/voice rules. PSD/AI/ZIP → extract assets.',
    '   - If only `Brand Drive folder` link given (no upload): download via Google Drive MCP. Same extraction as above.',
    '   - If `Reference sites` (favSites) provided (typically when no brand kit exists): crawl with Firecrawl as before.',
    '   - If `Mood word` provided (no brand): use as the anchor for Q1 mood selection.',
    '   - Document everything in `clients/' + slug + '/INPUTS.md` so brainstorm + DESIGN.md generation can reference it. Skip this step ONLY if NO favSites AND NO brandDriveLink AND NO moodWord were given.',
    '3. Read `clients/_archetype-registry.md` to see which archetype / typography / motion / anchor combos are already used. Brainstorm Q2-Q5 MUST exclude them for the most-recent realtor.',
    '4. Run brainstorm skill (Q1-Q9). Use Step 2 analysis as PRE-FILLED candidates per question — user confirms each or overrides. Hard rules: pick a different archetype than the last realtor (12 options A-L); NEVER reuse T1 Fraunces+Inter consecutively (10 options T1-T10); default motion M2 unless brand calls otherwise; Q8b specialty page = `/presales` (presale specialist) OR `/process` (generalist) OR both OR neither — URL slug MUST match actual specialty.',
    '5. Update `clients/_archetype-registry.md` — append this realtor\'s chosen archetype + hero ID + typography ID + motion ID + anchor + specialty.',
    '6. Fill DESIGN.md from brainstorm output + brief + Step 2 INPUTS.md. Color palette MUST reflect logo color extraction if a logo was provided. Voice rules MUST reflect the brief\'s `voice` field verbatim.',
    '7. Generate images via gpt-image-2 (~10-12 images, $1-3 budget). Portraits in COLOR by default — never `grayscale` filter unless brief explicitly calls for B&W treatment.',
    '8. Build pages — REWRITE `app/[locale]/page.tsx` from the chosen archetype\'s section grammar (do NOT copy Chloe or Hacey homepage). Rewrite Header + Footer if archetype demands different nav/footer style. Apply Q4 typography pairing in `app/[locale]/layout.tsx` font loading. Apply Q5 motion mode in `globals.css`. Implement Q8b — keep the chosen specialty page route, delete the unused one from app + nav + sitemap. **Footer compliance text MUST reference the `Regulator` from the brief above (BCFSA / RECA / RECO) — never hardcode "BCFSA" if Province is AB or ON. Use Canadian "licence" spelling for RECA, "registration number" for RECO.**',
    '9. Wire forms: contact + value. Value page = MANUAL-REVIEW only by default (no algorithmic estimate shown — just lead capture + "realtor emails within 24h").',
    '10. Strip `ko` locale (English-only default).',
    '11. Full SEO: per-brand favicon set (run `scripts/generate-favicons.py`) + `site.webmanifest` + per-page unique title/description/OG image + JSON-LD (RealEstateAgent sitewide + Person on /about + FAQPage on Q&A) + sitemap + robots + llms.txt.',
    '12. Deploy to Vercel (scope `dans-projects-a527926b`).',
    '    - **Before first commit on the new repo:** `git config user.email "dan@crealwork.com"` (repo-local). Pro plan does NOT bypass the `Developer <developer@example.com>` placeholder block — locked 2026-04-25 after homesweetchloe deploy errored 0ms with empty logs.',
    '    - **Before each commit:** grep `Header.tsx` + `Footer.tsx` (and any new component) for hardcoded years (`/[12][0-9]{3}—/`), tagline strings, or brand names. ALL must come from `messages/en.json` translation keys, never inline JSX. Locked 2026-04-25 after homesweetchloe shipped with hardcoded `2026—` next to a t() that read `2024—`.',
    '13. Reply with: preview URL, OpenAI cost, archetype+typography+motion combo chosen, any decisions needed.',
    '',
    'Target delivery: 4-6 hours from start.',
    '',
    '---',
    '',
    '# Realtor Site Brief — ' + (data.name || 'Unknown'),
    '',
    '## Identity',
    '- Name (as displayed): ' + (data.name || ''),
    '- Province: ' + (data.province || '—'),
    '- Regulator: ' + (data.regulator || '—'),
    '- Brokerage: ' + (data.brokerageName || ''),
    '- Brokerage office address: ' + (data.brokerageAddress || ''),
    '- ' + (data.regulator || 'Real estate license') + ' #: ' + (data.licenseNumber || ''),
    '- Cell: ' + (data.cell || ''),
    '- Email: ' + (data.email || ''),
    '- Service areas: ' + (data.areas || ''),
    '- Social media: ' + (data.socialMedia || '—'),
    '- Languages spoken with clients: ' + (data.languages || 'English only'),
    '',
    '## Specialty + Voice',
    '- Specialty: ' + (data.specialty || ''),
    '- Voice (raw material for About copy): ' + (data.voice || ''),
    '',
    '## Domain',
    '- ' + (data.hasDomain || '—') + (data.domainUrl ? ' — ' + data.domainUrl : ''),
    '',
    '## Brand',
    brand,
    '',
    '## Headshot',
    headshotFilesText || '- (none uploaded)',
    '',
    '## Logo',
    logoFilesText || '- (none uploaded — design or skip)',
    '',
    '## Add-ons & content',
    '- Presale projects to feature: ' + (data.presaleProjects || '—'),
    '- Wants MLS/listings search: ' + (data.wantsListingsSearch || 'No'),
    '- Has testimonials: ' + (data.hasTestimonials || '—'),
    '- Testimonials: ' + (data.testimonials || '—'),
    '- Avoid: ' + (data.avoidNote || '—'),
  ].join('\n');
}

// ─── Realtor Site Onboarding handlers ────────────────────────────────────────

/**
 * Onboarding spreadsheet is SEPARATE from the waitlist spreadsheet.
 * Hardcoded to Dan's "Sunday Sites — Realtor Onboarding" sheet.
 * Override via Script Properties → ONBOARDING_SPREADSHEET_ID if needed.
 */
var ONBOARDING_SPREADSHEET_ID_DEFAULT = '10g0nrLKxFculS44RzsBz-jIXflwOWV7vYkN3BVRmH0M';

function getOnboardingSpreadsheetId() {
  var override = PropertiesService.getScriptProperties().getProperty('ONBOARDING_SPREADSHEET_ID');
  return override || ONBOARDING_SPREADSHEET_ID_DEFAULT;
}

function saveOnboardingToSheet(data) {
  var ss = SpreadsheetApp.openById(getOnboardingSpreadsheetId());
  var sheet = ss.getSheetByName(ONBOARDING_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(ONBOARDING_SHEET_NAME);
    sheet.appendRow(ONBOARDING_COLUMNS);
  } else {
    var lastCol = sheet.getLastColumn();
    if (lastCol < ONBOARDING_COLUMNS.length) {
      var newHeaders = ONBOARDING_COLUMNS.slice(lastCol);
      sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
    }
  }

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.cell || '',
    data.brokerageName || '',
    data.brokerageAddress || '',
    data.licenseNumber || '',
    data.areas || '',
    data.socialMedia || '',
    data.specialty || '',
    data.voice || '',
    data.presaleProjects || '',
    data.wantsListingsSearch || '',
    data.hasTestimonials || '',
    data.testimonials || '',
    data.hasDomain || '',
    data.domainUrl || '',
    data.hasBrand || '',
    data.brandDriveLink || '',
    data.favSites || '',
    data.moodWord || '',
    data.headshotLink || '',
    data.languages || '',
    data.avoidNote || '',
    data.utm_source || '',
    data.utm_medium || '',
    data.utm_campaign || '',
    data.utm_content || '',
    data.utm_term || '',
    data.landing_url || '',
    data.landing_referrer || '',
    data.province || '',
    data.regulator || '',
    urlListString(data.headshotFiles),
    urlListString(data.logoFiles),
    urlListString(data.brandFiles),
    data.uploadSessionId || ''
  ]);
}

function sendOnboardingNotification(data) {
  var subject = '🟡 Sunday Sites onboarding — ' + (data.name || 'Unknown');
  var html = buildOnboardingEmailHtml(data);

  NOTIFY_EMAILS.forEach(function(email) {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: html,
      name: 'Sunday Sites',
      replyTo: data.email || ''
    });
  });
}

function buildOnboardingEmailHtml(data) {
  var timestamp = data.timestamp
    ? new Date(data.timestamp).toLocaleString('en-US', { timeZone: 'America/Vancouver', dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver', dateStyle: 'medium', timeStyle: 'short' });

  function row(label, value) {
    if (!value) return '';
    return '<tr>'
      + '<td style="padding:8px 0 8px 0;vertical-align:top;width:40%;">'
      + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">' + label + '</p>'
      + '</td>'
      + '<td style="padding:8px 0;vertical-align:top;text-align:right;">'
      + '<p style="margin:0;font-size:14px;color:#0A0A0A;font-weight:500;line-height:1.5;">' + escapeHtml(value) + '</p>'
      + '</td>'
      + '</tr>';
  }

  function linkRow(label, url) {
    if (!url) return '';
    return '<tr>'
      + '<td style="padding:8px 0;vertical-align:top;width:40%;">'
      + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">' + label + '</p>'
      + '</td>'
      + '<td style="padding:8px 0;text-align:right;">'
      + '<a href="' + escapeHtml(url) + '" style="font-size:14px;color:#800020;font-weight:500;">' + escapeHtml(url) + '</a>'
      + '</td>'
      + '</tr>';
  }

  function fileListRow(label, jsonStr) {
    var arr = parseFileArray(jsonStr);
    if (arr.length === 0) return '';
    var items = arr.map(function(f) {
      return '<a href="' + escapeHtml(f.url || '') + '" style="display:block;font-size:13px;color:#0A0A0A;text-decoration:underline;line-height:1.6;">'
        + escapeHtml(f.name || 'file') + '</a>';
    }).join('');
    return '<tr>'
      + '<td style="padding:8px 0;vertical-align:top;width:40%;">'
      + '<p style="margin:0;font-size:11px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:1px;">' + label + ' (' + arr.length + ')</p>'
      + '</td>'
      + '<td style="padding:8px 0;text-align:right;">'
      + items
      + '</td>'
      + '</tr>';
  }

  return '<!DOCTYPE html>'
    + '<html><head><meta charset="utf-8"></head>'
    + '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">'
    + '<tr><td align="center">'
    + '<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">'

    // Header
    + '<tr><td style="background:#0A0A0A;padding:28px 40px;text-align:center;">'
    + '<p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#ffffff;letter-spacing:0.5px;">Sunday Sites.</p>'
    + '</td></tr>'

    // Badge + name
    + '<tr><td style="padding:28px 40px 0;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + '<td style="background:#C9A95C;color:#0A0A0A;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">SITE ONBOARDING</td>'
    + '</tr></table>'
    + '<p style="margin:16px 0 4px;font-size:22px;font-weight:700;color:#0A0A0A;">' + escapeHtml(data.name || 'Unknown') + '</p>'
    + '<p style="margin:0;font-size:14px;color:#6B6B6B;">' + escapeHtml(data.email || '') + '</p>'
    + '</td></tr>'

    // Divider
    + '<tr><td style="padding:20px 40px 0;"><div style="border-top:1px solid #E5E5E5;"></div></td></tr>'

    // Data table
    + '<tr><td style="padding:20px 40px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0">'

    + row('Cell', data.cell)
    + row('Province', data.province)
    + row('Regulator', data.regulator)
    + row('Brokerage', data.brokerageName)
    + row('Brokerage Address', data.brokerageAddress)
    + row('License #', data.licenseNumber)
    + row('Service Areas', data.areas)
    + row('Social Media', data.socialMedia)
    + row('Specialty', data.specialty)
    + row('Voice', data.voice)
    + row('Presale Projects', data.presaleProjects)
    + row('Wants Listings Search', data.wantsListingsSearch)
    + row('Has Testimonials', data.hasTestimonials)
    + row('Testimonials', data.testimonials)

    + '<tr><td colspan="2" style="padding:12px 0 4px;"><div style="border-top:1px solid #F0F0F0;"></div></td></tr>'

    + row('Has Domain?', data.hasDomain)
    + row('Domain URL', data.domainUrl)
    + row('Has Brand?', data.hasBrand)
    + linkRow('Brand Drive Link', data.brandDriveLink)
    + row('Fav Sites', data.favSites)
    + row('Mood Word', data.moodWord)
    + fileListRow('Headshot files', data.headshotFiles)
    + fileListRow('Logo files', data.logoFiles)
    + fileListRow('Brand files', data.brandFiles)

    + '<tr><td colspan="2" style="padding:12px 0 4px;"><div style="border-top:1px solid #F0F0F0;"></div></td></tr>'

    + row('Languages', data.languages)
    + row('Avoid Note', data.avoidNote)

    + (data.utm_source || data.utm_campaign ? buildUtmRow(data) : '')
    + row('Submitted', timestamp)

    + '</table>'
    + '</td></tr>'

    // CTAs
    + '<tr><td style="padding:24px 40px 12px;">'
    + '<a href="https://docs.google.com/spreadsheets/d/' + encodeURIComponent(getOnboardingSpreadsheetId()) + '/edit" '
    + 'style="display:inline-block;background:#0A0A0A;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;margin-right:8px;">Open Sheet &rarr;</a>'
    + '<a href="mailto:' + escapeHtml(data.email || '') + '?subject=' + encodeURIComponent('Your Sunday Sites mockup — ' + (data.name || '').split(' ')[0]) + '" '
    + 'style="display:inline-block;background:#ffffff;color:#0A0A0A;font-size:14px;font-weight:600;padding:11px 24px;border-radius:6px;text-decoration:none;border:1px solid #E5E5E5;">Reply to ' + escapeHtml((data.name || 'Lead').split(' ')[0]) + '</a>'
    + '</td></tr>'

    // Claude-ready brief (paste-into-Claude block)
    + '<tr><td style="padding:8px 40px 32px;">'
    + '<div style="border-top:1px solid #E5E5E5;padding-top:24px;">'
    + '<p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#6B6B6B;">'
    + '<span style="background:#C9A95C;color:#0A0A0A;padding:2px 8px;border-radius:4px;margin-right:6px;">CLAUDE</span>'
    + 'Paste this in a fresh chat to start the build</p>'
    + '<p style="margin:0 0 12px;font-size:12px;color:#6B6B6B;line-height:1.4;">Triple-click any line, Cmd/Ctrl-A inside the box, then copy. Drop into a new Claude Code session — that\'s it.</p>'
    + '<pre style="font-family:\'SF Mono\',\'Monaco\',\'Menlo\',Consolas,monospace;font-size:12px;line-height:1.55;color:#0A0A0A;background:#FAFAFA;border:1px solid #E5E5E5;border-radius:6px;padding:16px;margin:0;white-space:pre-wrap;word-break:break-word;overflow-x:auto;">'
    + escapeHtml(buildClaudePromptForBuild(data))
    + '</pre>'
    + '</div>'
    + '</td></tr>'

    // Footer
    + '<tr><td style="background:#f5f5f5;padding:20px 40px;text-align:center;">'
    + '<p style="margin:0;font-size:12px;color:#6B6B6B;">sundayable.com &mdash; Sunday Sites</p>'
    + '</td></tr>'

    + '</table>'
    + '</td></tr></table>'
    + '</body></html>';
}

// ─── End Realtor Site Onboarding handlers ────────────────────────────────────

/**
 * Test function — run manually in Apps Script editor to preview the email
 */
function testEmail() {
  var testData = {
    name: 'Jane Kim',
    company: 'Haven Real Estate Group',
    phone: '604-555-0123',
    email: 'jane@example.com',
    referred_by: 'direct',
    timestamp: new Date().toISOString(),
    utm_source: 'brevo',
    utm_medium: 'email',
    utm_campaign: 'masterclass_may5',
    utm_content: 'hero_cta',
    utm_term: '',
    landing_url: 'https://www.sundayable.com/?utm_source=brevo&utm_medium=email&utm_campaign=masterclass_may5&utm_content=hero_cta',
    landing_referrer: 'https://email.brevo.com/'
  };
  sendNotification(testData);
}

/**
 * Manual test trigger: sends the realtor-onboarding notification email
 * (with the latest Claude prompt template) using sample data — does NOT
 * write to the sheet. Run from Apps Script editor or `clasp run sendTestPromptEmail`
 * to verify prompt template + email rendering after script edits.
 */
function sendTestPromptEmail() {
  var sample = {
    formType: 'realtor-site-onboarding',
    name: 'Test Realtor (skill-prompt verification)',
    email: 'test-realtor@example.com',
    province: 'BC',
    regulator: 'BCFSA',
    cell: '(604) 000-0000',
    brokerageName: 'Test Brokerage Realty',
    brokerageAddress: 'Vancouver, BC',
    licenseNumber: 'TEST-LICENSE-0000',
    areas: 'Vancouver, Burnaby, Richmond',
    socialMedia: '@test.realtor',
    languages: 'English, Mandarin',
    specialty: 'Resale condo / townhome, First-time buyers, Investment property',
    voice: '(Test voice copy — would be replaced with the real realtor bio.) After 15 years in tech, I moved into real estate to apply analytical thinking to one of life\'s biggest decisions.',
    presaleProjects: '—',
    wantsListingsSearch: 'No',
    hasTestimonials: 'No',
    testimonials: '—',
    hasDomain: 'I want help getting one',
    domainUrl: '',
    hasBrand: 'No',
    moodWord: 'Calm',
    favSites: 'https://www.aritzia.com/, https://www.evernew.ca/',
    headshotFiles: JSON.stringify([
      { url: 'https://example-blob.vercel-storage.com/realtor-onboarding/test-uuid/headshot-1714250000-test.jpg', name: 'test-headshot-01.jpg', size: 2400000 },
      { url: 'https://example-blob.vercel-storage.com/realtor-onboarding/test-uuid/headshot-1714250012-test2.jpg', name: 'test-headshot-02.jpg', size: 3100000 }
    ]),
    logoFiles: JSON.stringify([]),
    brandFiles: JSON.stringify([]),
    uploadSessionId: 'test-uuid-0000-0000-0000-000000000000',
    avoidNote: '—',
    timestamp: new Date()
  };
  sendOnboardingNotification(sample);
}

/**
 * One-shot setup: writes the canonical header row into row 1 of the
 * RealtorOnboarding sheet. Safe to re-run — it overwrites row 1 only.
 * Use this if row 1 got cleared / edited and no longer matches the
 * ONBOARDING_COLUMNS schema.
 */
function seedOnboardingHeaders() {
  var ss = SpreadsheetApp.openById(getOnboardingSpreadsheetId());
  var sheet = ss.getSheetByName(ONBOARDING_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ONBOARDING_SHEET_NAME);
  }
  sheet.getRange(1, 1, 1, ONBOARDING_COLUMNS.length).setValues([ONBOARDING_COLUMNS]);
  sheet.getRange(1, 1, 1, ONBOARDING_COLUMNS.length)
    .setFontWeight('bold')
    .setBackground('#0a0a0a')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  Logger.log('Seeded ' + ONBOARDING_COLUMNS.length + ' headers into ' + ONBOARDING_SHEET_NAME);
}
