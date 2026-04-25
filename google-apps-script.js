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
  'Timestamp', 'Name', 'Email', 'Cell', 'License or Brokerage', 'Areas', 'Specialty', 'Voice',
  'Has Domain', 'Domain URL', 'Has Brand', 'Brand Drive Link', 'Fav Sites', 'Mood Word',
  'Headshot Drive Link', 'Languages', 'Avoid Note',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term',
  'Landing URL', 'Landing Referrer'
];

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

// ─── Realtor Site Onboarding handlers ────────────────────────────────────────

/**
 * Onboarding spreadsheet is SEPARATE from the waitlist spreadsheet.
 * On first submit, auto-create "Sunday Sites — Realtor Onboarding" in the
 * script owner's Drive and remember its ID via PropertiesService. Dan can
 * find it by name in Drive after the first submission and bookmark it.
 */
function getOrCreateOnboardingSpreadsheetId() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ONBOARDING_SPREADSHEET_ID');
  if (id) return id;

  var ss = SpreadsheetApp.create('Sunday Sites — Realtor Onboarding');
  var sheet = ss.getActiveSheet();
  sheet.setName(ONBOARDING_SHEET_NAME);
  sheet.appendRow(ONBOARDING_COLUMNS);
  // Freeze header row + bold it for usability
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, ONBOARDING_COLUMNS.length).setFontWeight('bold');

  id = ss.getId();
  props.setProperty('ONBOARDING_SPREADSHEET_ID', id);
  return id;
}

function saveOnboardingToSheet(data) {
  var id = getOrCreateOnboardingSpreadsheetId();
  var ss = SpreadsheetApp.openById(id);
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
    data.licenseOrBrokerage || '',
    data.areas || '',
    data.specialty || '',
    data.voice || '',
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
    data.landing_referrer || ''
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
    + row('License / Brokerage', data.licenseOrBrokerage)
    + row('Service Areas', data.areas)
    + row('Specialty', data.specialty)
    + row('Voice', data.voice)

    + '<tr><td colspan="2" style="padding:12px 0 4px;"><div style="border-top:1px solid #F0F0F0;"></div></td></tr>'

    + row('Has Domain?', data.hasDomain)
    + row('Domain URL', data.domainUrl)
    + row('Has Brand?', data.hasBrand)
    + linkRow('Brand Drive Link', data.brandDriveLink)
    + row('Fav Sites', data.favSites)
    + row('Mood Word', data.moodWord)
    + linkRow('Headshot Drive Link', data.headshotLink)

    + '<tr><td colspan="2" style="padding:12px 0 4px;"><div style="border-top:1px solid #F0F0F0;"></div></td></tr>'

    + row('Languages', data.languages)
    + row('Avoid Note', data.avoidNote)

    + (data.utm_source || data.utm_campaign ? buildUtmRow(data) : '')
    + row('Submitted', timestamp)

    + '</table>'
    + '</td></tr>'

    // CTA
    + '<tr><td style="padding:24px 40px 32px;">'
    + '<a href="mailto:' + escapeHtml(data.email || '') + '?subject=' + encodeURIComponent('Your Sunday Sites mockup — ' + (data.name || '').split(' ')[0]) + '" '
    + 'style="display:inline-block;background:#0A0A0A;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">Reply to ' + escapeHtml((data.name || 'Lead').split(' ')[0]) + '</a>'
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
