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

// ── Profile helpers ────────────────────────────────────────────────────────

export async function getProfile(userId) {
  if (!userId) return null;
  const rows = await sbSelect('user_profile', `user_id=eq.${userId}&select=*&limit=1`);
  return rows && rows.length > 0 ? rows[0] : null;
}

// Format a profile for inclusion in AI prompts. Returns "" if no profile.
// Designed to be terse but information-dense — the model needs facts, not prose.
export function formatProfileForPrompt(p) {
  if (!p) return '';
  const parts = [];
  if (p.biological_sex) parts.push(`${p.biological_sex}`);
  if (p.birth_year) {
    const age = new Date().getFullYear() - p.birth_year;
    parts.push(`${age}yo`);
  }
  if (p.height_cm) parts.push(`${p.height_cm}cm`);
  if (p.weight_kg) parts.push(`${p.weight_kg}kg`);
  if (p.biological_sex === 'female') {
    if (p.pregnancy_status && p.pregnancy_status !== 'not_applicable' && p.pregnancy_status !== 'none') {
      parts.push(p.pregnancy_status);
    }
    if (p.menstrual_status && p.menstrual_status !== 'not_applicable') {
      parts.push(p.menstrual_status.replace(/_/g, ' '));
    }
  }
  if (p.activity_level) parts.push(`activity:${p.activity_level}`);
  if (p.goal) parts.push(`goal:${p.goal}`);
  if (p.conditions && p.conditions.length > 0) parts.push(`conditions:[${p.conditions.join(', ')}]`);
  if (p.medications && p.medications.length > 0) parts.push(`medications:[${p.medications.join(', ')}]`);
  if (p.allergies && p.allergies.length > 0) parts.push(`allergies:[${p.allergies.join(', ')}]`);
  if (p.dietary_restrictions && p.dietary_restrictions.length > 0) parts.push(`diet:[${p.dietary_restrictions.join(', ')}]`);
  return parts.length > 0 ? parts.join(', ') : '';
}

// Stable hash of profile fields that affect AI output. Used for cache key.
// Round weight to nearest kg so a 0.5kg fluctuation doesn't bust the cache.
export async function hashProfile(p) {
  if (!p) return 'noprofile';
  const norm = [
    p.biological_sex || '',
    p.birth_year ? Math.floor(p.birth_year / 1) : '',
    p.height_cm ? Math.round(p.height_cm) : '',
    p.weight_kg ? Math.round(p.weight_kg) : '',
    p.pregnancy_status || '',
    p.menstrual_status || '',
    p.activity_level || '',
    p.goal || '',
    (p.conditions || []).map(c => c.toLowerCase().trim()).sort().join('|'),
    (p.medications || []).map(c => c.toLowerCase().trim()).sort().join('|'),
    (p.allergies || []).map(c => c.toLowerCase().trim()).sort().join('|'),
    (p.dietary_restrictions || []).map(c => c.toLowerCase().trim()).sort().join('|'),
  ].join('::');
  return sha256(norm);
}

// Detect whether medications are present — used to inject safety prompt + disclaimers
export function hasMedications(p) {
  return !!(p && Array.isArray(p.medications) && p.medications.length > 0);
}
