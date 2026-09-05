import { sbSelect, sbDelete, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    if (!userId) return json({ error: 'userId required' }, { status: 400 });
    const rows = await sbSelect('symptom_log', `user_id=eq.${userId}&order=started_date.desc&select=*`);
    return json({ symptoms: rows || [] });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, symptom } = body || {};
    if (!userId || !symptom?.symptom) return json({ error: 'Missing fields' }, { status: 400 });
    const row = {
      user_id: userId,
      symptom: symptom.symptom.trim(),
      frequency: symptom.frequency || null,
      notes: symptom.notes || null,
      started_date: symptom.started_date || new Date().toISOString().slice(0, 10),
      ended_date: symptom.ended_date || null,
    };
    const res = await fetch(`${SB}/rest/v1/symptom_log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const data = await res.json();
    return json({ symptom: Array.isArray(data) ? data[0] : data });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, id, symptom } = body || {};
    if (!userId || !id || !symptom?.symptom) return json({ error: 'Missing fields' }, { status: 400 });
    const patch = {
      symptom: symptom.symptom.trim(),
      frequency: symptom.frequency || null,
      notes: symptom.notes || null,
      started_date: symptom.started_date || new Date().toISOString().slice(0, 10),
      ended_date: symptom.ended_date || null,
      review: null,
      reviewed_at: null,
    };
    const res = await fetch(`${SB}/rest/v1/symptom_log?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return json({ error: 'Update failed' }, { status: 500 });
    const data = await res.json();
    return json({ symptom: Array.isArray(data) ? data[0] : data });
  }

  if (req.method === 'DELETE') {
    const userId = url.searchParams.get('userId');
    const id = url.searchParams.get('id');
    if (!userId || !id) return json({ error: 'Missing userId or id' }, { status: 400 });
    const ok = await sbDelete('symptom_log', `id=eq.${id}&user_id=eq.${userId}`);
    if (!ok) return json({ error: 'Delete failed' }, { status: 500 });
    return json({ deleted: true });
  }

  return new Response('Method not allowed', { status: 405 });
}
