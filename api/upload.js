import { handleUpload } from '@vercel/blob/client';

// Client upload pattern: browser uploads directly to Vercel Blob using a
// short-lived signed URL. This endpoint only generates the URL after
// authorizing the request — it never streams the file. Avoids the
// multipart/streams headache that broke the previous server-upload
// implementation, and stays well under serverless body-size limits.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cheap referer/origin gate (forgeable but blocks casual abuse).
  const ref = String(req.headers.referer || req.headers.origin || '');
  const ALLOWED = ['sundayable.com', 'localhost'];
  if (!ALLOWED.some(h => ref.includes(h))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ALLOWED_SLOTS = new Set(['headshot', 'logo', 'brand']);
  const ALLOWED_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/svg+xml',
    'application/pdf',
    'application/zip',
    'application/octet-stream'
  ];
  const MAX_BYTES = 10 * 1024 * 1024;

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try { payload = JSON.parse(clientPayload || '{}'); } catch (_) {}

        const slot = String(payload.slot || '');
        const sessionId = String(payload.sessionId || '');

        if (!ALLOWED_SLOTS.has(slot)) {
          throw new Error('Invalid slot');
        }
        if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
          throw new Error('Invalid sessionId');
        }
        if (!pathname.startsWith(`realtor-onboarding/${sessionId}/${slot}-`)) {
          throw new Error('Pathname does not match slot/session');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ slot, sessionId }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: we don't need to log; the URL is captured by the form payload.
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    return res.status(400).json({ error: err && err.message ? err.message : 'Upload error' });
  }
}
