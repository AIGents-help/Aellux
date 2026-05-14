/**
 * /api/checkin
 * Weekly protocol check-in.
 * GET  ?userId= → list recent check-ins
 * POST → submit a check-in
 */
import { sbSelect, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getMondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req) {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    if (!userId) return json({ error: 'userId required' }, { status: 400 });
    const rows = await sbSelect('checkins',
      `user_id=eq.${userId}&order=week_start.desc&limit=12&select=*`
    );
    return json({ checkins: rows || [], currentWeek: getMondayOf() });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, protocolFollowed, energyLevel, sleepQuality, mood, notableChanges, blockers } = body || {};
    if (!userId) return json({ error: 'userId required' }, { status: 400 });

    const weekStart = getMondayOf();
    const SB_URL = process.env.SUPABASE_URL;
    const K = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    const res = await fetch(`${SB_URL}/rest/v1/checkins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', apikey: K, Authorization: `Bearer ${K}`,
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId, week_start: weekStart,
        protocol_followed: protocolFollowed || null,
        energy_level: energyLevel || null,
        sleep_quality: sleepQuality || null,
        mood: mood || null,
        notable_changes: notableChanges || null,
        blockers: blockers || null,
      }),
    });
    const data = await res.json();
    return json({ checkin: Array.isArray(data) ? data[0] : data });
  }

  return new Response('Method not allowed', { status: 405 });
}
