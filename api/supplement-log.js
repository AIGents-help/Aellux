import { sbSelect, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    if (!userId) return json({ error: 'userId required' }, { status: 400 });
    const rows = await sbSelect('supplement_log', `user_id=eq.${userId}&order=started_date.desc&select=*`);
    return json({ supplements: rows || [] });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, supplement } = body || {};
    if (!userId || !supplement?.name) return json({ error: 'Missing fields' }, { status: 400 });
    const row = {
      user_id: userId,
      name: supplement.name.trim(),
      dose: supplement.dose || null,
      unit: supplement.unit || null,
      frequency: supplement.frequency || 'Daily',
      started_date: supplement.started_date || new Date().toISOString().slice(0, 10),
      ended_date: supplement.ended_date || null,
      notes: supplement.notes || null,
    };
    const res = await fetch(`${SB}/rest/v1/supplement_log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const data = await res.json();
    return json({ supplement: Array.isArray(data) ? data[0] : data });
  }

  return new Response('Method not allowed', { status: 405 });
}
