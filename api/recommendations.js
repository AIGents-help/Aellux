/**
 * /api/recommendations
 * CRUD for user recommendations and their compliance status.
 * GET  ?userId=  → list all recommendations with status
 * POST → save new recommendations extracted from AI output
 * PATCH ?id= → update status (doing/tried_not_working/not_doing/resolved)
 */
import { sbSelect, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  ...extra,
});

export default async function handler(req) {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status'); // optional filter
    if (!userId) return json({ error: 'userId required' }, { status: 400 });
    const filter = status
      ? `user_id=eq.${userId}&status=eq.${status}&order=created_at.desc&select=*`
      : `user_id=eq.${userId}&order=created_at.desc&select=*&limit=50`;
    const rows = await sbSelect('recommendations', filter);
    return json({ recommendations: rows || [] });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, recommendations } = body || {};
    if (!userId || !recommendations?.length) return json({ error: 'Missing fields' }, { status: 400 });

    // Batch insert — skip duplicates (same user + recommendation text within 30 days)
    const existing = await sbSelect('recommendations',
      `user_id=eq.${userId}&created_at=gte.${new Date(Date.now() - 30 * 86400000).toISOString()}&select=recommendation`
    );
    const existingSet = new Set((existing || []).map(r => r.recommendation.toLowerCase().trim()));

    const toInsert = recommendations
      .filter(r => r.recommendation && !existingSet.has(r.recommendation.toLowerCase().trim()))
      .map(r => ({
        user_id: userId,
        source: r.source || 'synthesis',
        source_id: r.source_id || null,
        recommendation: r.recommendation.trim(),
        marker_context: r.marker_context || null,
        target_marker: r.target_marker || null,
        target_direction: r.target_direction || null,
        status: 'pending',
      }));

    if (!toInsert.length) return json({ inserted: 0, message: 'No new recommendations to add' });

    const res = await fetch(`${SB}/rest/v1/recommendations`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(toInsert),
    });
    const data = await res.json();
    return json({ inserted: Array.isArray(data) ? data.length : 0, recommendations: data });
  }

  if (req.method === 'PATCH') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { id, userId, status, userNote } = body || {};
    if (!id || !userId || !status) return json({ error: 'Missing fields' }, { status: 400 });
    const validStatuses = ['pending', 'doing', 'tried_not_working', 'not_doing', 'resolved'];
    if (!validStatuses.includes(status)) return json({ error: 'Invalid status' }, { status: 400 });

    const res = await fetch(`${SB}/rest/v1/recommendations?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ status, user_note: userNote || null, updated_at: new Date().toISOString() }),
    });
    return json({ ok: res.ok });
  }

  return new Response('Method not allowed', { status: 405 });
}
