// Shared helpers for edge functions. No npm imports — uses fetch + Web Crypto.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dpweejtslbzmstcywcnl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Stable, order-independent hash of a marker set.
export async function hashMarkers(markers) {
  const norm = (markers || [])
    .map(m => `${(m.name || '').trim().toLowerCase()}|${m.value}|${m.unit || ''}|${m.status || ''}`)
    .sort()
    .join(';');
  return sha256(norm);
}

export async function sbSelect(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows : null;
}

export async function sbInsert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.warn('[sbInsert]', table, await res.text().catch(() => '')); return null; }
  return res.json();
}

export async function sbUpsert(table, body, onConflict) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.warn('[sbUpsert]', table, await res.text().catch(() => '')); return null; }
  return res.json();
}

export async function sbUpdate(table, query, patch) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

// Rate-limit window helper. Returns { ok, count, limit, resetAt }.
export async function rateLimit({ userId, endpoint, limit, windowHours }) {
  if (!userId) return { ok: true, count: 0, limit, resetAt: null }; // anonymous skipped
  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const q = `user_id=eq.${userId}&endpoint=eq.${endpoint}&created_at=gte.${since}&select=id`;
  const rows = await sbSelect('usage_log', q);
  const count = rows ? rows.length : 0;
  return {
    ok: count < limit,
    count,
    limit,
    resetAt: new Date(Date.now() + windowHours * 3600_000).toISOString(),
  };
}

export async function logUsage(userId, endpoint) {
  if (!userId) return;
  await sbInsert('usage_log', { user_id: userId, endpoint });
}

export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}
