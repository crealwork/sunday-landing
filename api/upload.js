import { put } from '@vercel/blob';

export const config = { runtime: 'edge' };

const SLOTS = new Set(['headshot', 'logo', 'brand']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_HOST_FRAGMENTS = ['sundayable.com', 'localhost'];

export default async function handler(req) {
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  // Cheap abuse protection: require referer/origin from our domain.
  // Not a strong defense (referer is forgeable), but blocks casual abuse.
  const ref = req.headers.get('referer') || req.headers.get('origin') || '';
  if (!ALLOWED_HOST_FRAGMENTS.some(h => ref.includes(h))) {
    return jsonError('Forbidden', 403);
  }

  let form;
  try {
    form = await req.formData();
  } catch (e) {
    return jsonError('Invalid form data', 400);
  }

  const file = form.get('file');
  const slot = String(form.get('slot') || '');
  const sessionId = String(form.get('sessionId') || '');

  if (!file || typeof file === 'string') return jsonError('Missing file', 400);
  if (!SLOTS.has(slot)) return jsonError('Invalid slot', 400);
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) return jsonError('Invalid sessionId', 400);
  if (file.size === 0) return jsonError('Empty file', 400);
  if (file.size > MAX_BYTES) return jsonError('File too large (max 10MB)', 413);

  const safeName = String(file.name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
  const path = `realtor-onboarding/${sessionId}/${slot}-${Date.now()}-${safeName}`;

  try {
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
  } catch (e) {
    return jsonError('Upload failed: ' + (e && e.message ? e.message : 'unknown'), 500);
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
