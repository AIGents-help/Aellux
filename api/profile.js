import { sbSelect, sbUpsert, json } from './_lib.js';

export const config = { runtime: 'edge' };

const ALLOWED_FIELDS = [
  'biological_sex', 'birth_year', 'height_cm', 'weight_kg',
  'pregnancy_status', 'menstrual_status',
  'activity_level', 'conditions', 'medications', 'allergies',
  'dietary_restrictions', 'goal', 'source',
  // Body composition
  'body_fat_pct', 'lean_mass_kg', 'waist_cm', 'visceral_fat',
  'bone_density_tscore', 'vo2_max',
];

const SEX_VALUES = ['male', 'female', 'intersex'];
const PREGNANCY_VALUES = ['not_applicable', 'pregnant', 'breastfeeding', 'trying', 'none'];
const MENSTRUAL_VALUES = ['cycling', 'postmenopausal', 'perimenopausal', 'irregular', 'hormonal_bc', 'not_applicable'];
const ACTIVITY_VALUES = ['sedentary', 'light', 'moderate', 'active', 'athlete'];

function sanitize(payload) {
  const out = {};
  for (const k of ALLOWED_FIELDS) {
    if (!(k in payload)) continue;
    let v = payload[k];
    // Normalize empty strings to null for optional fields
    if (v === '' || v === undefined) v = null;
    if (k === 'biological_sex' && v && !SEX_VALUES.includes(v)) continue;
    if (k === 'pregnancy_status' && v && !PREGNANCY_VALUES.includes(v)) continue;
    if (k === 'menstrual_status' && v && !MENSTRUAL_VALUES.includes(v)) continue;
    if (k === 'activity_level' && v && !ACTIVITY_VALUES.includes(v)) continue;
    if (k === 'visceral_fat' && v != null) {
      v = parseInt(v, 10);
      if (Number.isNaN(v) || v < 1 || v > 59) continue;
    }
    if (k === 'birth_year' && v != null) {
      v = parseInt(v, 10);
      if (Number.isNaN(v) || v < 1900 || v > 2030) continue;
    }
    if (k === 'height_cm' && v != null) {
      v = parseFloat(v);
      if (Number.isNaN(v) || v < 50 || v > 280) continue;
    }
    if (k === 'weight_kg' && v != null) {
      v = parseFloat(v);
      if (Number.isNaN(v) || v < 20 || v > 400) continue;
    }
    if (['conditions', 'medications', 'allergies', 'dietary_restrictions'].includes(k)) {
      if (!Array.isArray(v)) v = [];
      v = v.filter(x => typeof x === 'string' && x.trim().length > 0).map(x => x.trim()).slice(0, 30);
    }
    out[k] = v;
  }
  return out;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return json({ error: 'Missing userId' }, { status: 400 });

  if (req.method === 'GET') {
    const rows = await sbSelect('user_profile', `user_id=eq.${userId}&select=*&limit=1`);
    return json({ profile: rows && rows.length > 0 ? rows[0] : null });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const patch = sanitize(body || {});
    patch.user_id = userId;
    patch.updated_at = new Date().toISOString();
    const result = await sbUpsert('user_profile', patch, 'user_id');
    if (!result) return json({ error: 'Save failed' }, { status: 500 });
    return json({ profile: Array.isArray(result) ? result[0] : result, ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
}
