/**
 * /api/share
 * POST: create a read-only share token for practitioner access
 * GET: retrieve shared data using the token
 */
import { sbSelect, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

async function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  const url = new URL(req.url);

  // GET /api/share?token=xxx — read shared data
  if (req.method === 'GET') {
    const token = url.searchParams.get('token');
    if (!token) return json({ error: 'Token required' }, { status: 400 });

    const rows = await sbSelect('share_tokens', `token=eq.${token}&select=*&limit=1`);
    if (!rows?.length) return json({ error: 'Invalid or expired link' }, { status: 404 });
    const share = rows[0];

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Fetch user's markers and synthesis (no PII beyond what the user chose to share)
    const docs = await sbSelect('documents', `user_id=eq.${share.user_id}&select=markers,document_date,document_type`);
    const protocol = await sbSelect('meal_plans', `user_id=eq.${share.user_id}&is_preview=eq.false&order=created_at.desc&limit=1&select=meals,cycle_length_days,meal_style,created_at`);

    return json({
      label: share.label || 'Aellux Health Share',
      created_at: share.created_at,
      documents: docs || [],
      protocol: protocol?.[0] || null,
    });
  }

  // POST /api/share — create share token
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, label, expiryDays = 30 } = body || {};
    if (!userId) return json({ error: 'userId required' }, { status: 400 });

    const token = await generateToken();
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(`${SB}/rest/v1/share_tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: userId, token, label: label || 'Practitioner Share', expires_at: expiresAt }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: 'Failed to create share link' }, { status: 500 });

    return json({ token, shareUrl: `https://aellux.health/share/${token}`, expiresAt });
  }

  return new Response('Method not allowed', { status: 405 });
}
