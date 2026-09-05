/**
 * /api/profile-avatar
 * Uploads a profile photo to Supabase Storage and saves the URL onto the
 * user's profile. Client-side resizing keeps payloads small before they
 * ever reach here — this just decodes, uploads, and records the URL.
 */
import { sbUpdate, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  if (req.method === 'DELETE') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId } = body || {};
    if (!userId) return json({ error: 'Missing userId' }, { status: 400 });
    await sbUpdate('user_profile', `user_id=eq.${userId}`, { avatar_url: null });
    return json({ removed: true });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { userId, imageBase64, mimeType } = body || {};
  if (!userId || !imageBase64) return json({ error: 'Missing userId or image' }, { status: 400 });

  const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ext = allowed[mimeType] || 'jpg';
  if (!allowed[mimeType]) return json({ error: 'Unsupported image type' }, { status: 400 });

  // Decode base64 (data URL prefix already stripped client-side) to raw bytes.
  let bytes;
  try {
    const binary = atob(imageBase64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch {
    return json({ error: 'Invalid image data' }, { status: 400 });
  }

  if (bytes.length > 5 * 1024 * 1024) return json({ error: 'Image too large (max 5MB)' }, { status: 400 });

  const path = `${userId}.${ext}`;
  const uploadRes = await fetch(`${SB}/storage/v1/object/avatars/${path}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'true', // overwrite any existing photo for this user
    },
    body: bytes,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text().catch(() => '');
    return json({ error: `Upload failed: ${err.slice(0, 200)}` }, { status: 502 });
  }

  const avatarUrl = `${SB}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`; // cache-bust on re-upload
  const ok = await sbUpdate('user_profile', `user_id=eq.${userId}`, { avatar_url: avatarUrl });
  if (!ok) return json({ error: 'Saved image but failed to update profile' }, { status: 500 });

  return json({ avatar_url: avatarUrl });
}
