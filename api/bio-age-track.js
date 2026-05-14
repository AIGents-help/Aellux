/**
 * /api/bio-age-track
 * Stores a bio age reading after synthesis generation.
 * Also returns the historical trajectory.
 */
import { sbSelect, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

async function sbInsert(table, row) {
  const r = await fetch(`${SB}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  return r.ok;
}

export default async function handler(req) {
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, biologicalAge, chronologicalAge, gapYears, keyDrivers } = body || {};
    if (!userId || !biologicalAge) return json({ error: 'Missing fields' }, { status: 400 });
    await sbInsert('bio_age_history', {
      user_id: userId,
      biological_age: parseFloat(biologicalAge),
      chronological_age: chronologicalAge ? parseInt(chronologicalAge) : null,
      gap_years: gapYears ? parseFloat(gapYears) : null,
      key_drivers: keyDrivers || [],
    });
    return json({ ok: true });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return json({ error: 'userId required' }, { status: 400 });
    const rows = await sbSelect('bio_age_history', `user_id=eq.${userId}&order=created_at.asc&select=biological_age,chronological_age,gap_years,key_drivers,created_at`);
    return json({ history: rows || [] });
  }

  return new Response('Method not allowed', { status: 405 });
}
