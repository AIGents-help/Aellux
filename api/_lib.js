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
  if (p.body_fat_pct) parts.push(`body_fat:${p.body_fat_pct}%`);
  if (p.lean_mass_kg) parts.push(`lean_mass:${p.lean_mass_kg}kg`);
  if (p.waist_cm) parts.push(`waist:${p.waist_cm}cm`);
  if (p.visceral_fat) parts.push(`visceral_fat:${p.visceral_fat}`);
  if (p.bone_density_tscore != null) parts.push(`bone_density_tscore:${p.bone_density_tscore}`);
  if (p.vo2_max) parts.push(`vo2_max:${p.vo2_max}ml/kg/min`);
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
    p.body_fat_pct != null ? Math.round(p.body_fat_pct * 10) / 10 : '',
    p.lean_mass_kg != null ? Math.round(p.lean_mass_kg * 10) / 10 : '',
    p.waist_cm || '',
    p.visceral_fat || '',
    p.bone_density_tscore != null ? p.bone_density_tscore : '',
    p.vo2_max != null ? Math.round(p.vo2_max) : '',
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

// ── Intelligence context ─────────────────────────────────────────────────────
// Pulls ALL accumulated intelligence for a user — doctor-missed flags,
// detected patterns, supplement log, bio age trajectory, correlation notes.
// Injected into every AI generation prompt so nothing is generated in isolation.
export async function getIntelligenceContext(userId) {
  if (!userId) return null;

  // Run all lookups in parallel
  const [suppRows, bioAgeRows, docRows, recRows, checkinRows] = await Promise.all([
    sbSelect('supplement_log', `user_id=eq.${userId}&ended_date=is.null&order=started_date.desc&select=name,dose,frequency,started_date&limit=10`),
    sbSelect('bio_age_history', `user_id=eq.${userId}&order=created_at.desc&limit=6&select=biological_age,chronological_age,gap_years,created_at`),
    sbSelect('documents', `user_id=eq.${userId}&select=doctor_missed_flags,document_date,document_type&limit=10`),
    sbSelect('recommendations', `user_id=eq.${userId}&order=created_at.desc&limit=20&select=recommendation,status,target_marker,target_direction,source,created_at,user_note`),
    sbSelect('checkins', `user_id=eq.${userId}&order=week_start.desc&limit=4&select=week_start,protocol_followed,energy_level,sleep_quality,mood,blockers`),
  ]);

  const ctx = {};

  // Active supplements
  if (suppRows && suppRows.length > 0) {
    ctx.supplements = suppRows.map(s =>
      `${s.name}${s.dose ? ' ' + s.dose : ''} ${s.frequency || 'daily'} (since ${s.started_date?.slice(0, 7) || 'unknown'})`
    ).join(', ');
  }

  // Biological age trajectory
  if (bioAgeRows && bioAgeRows.length > 0) {
    const latest = bioAgeRows[0];
    const oldest = bioAgeRows[bioAgeRows.length - 1];
    const trend = bioAgeRows.length > 1
      ? (parseFloat(latest.biological_age) - parseFloat(oldest.biological_age)).toFixed(1)
      : null;
    ctx.biologicalAge = {
      current: latest.biological_age,
      chronological: latest.chronological_age,
      gap: latest.gap_years,
      trend: trend, // negative = improving (getting biologically younger)
      trajectory: bioAgeRows.slice(0, 4).map(r => `${r.created_at?.slice(0, 7)}: ${r.biological_age}`).join(' → '),
    };
  }

  // Doctor-missed flags from recent documents
  const missedFlags = [];
  if (docRows) {
    for (const doc of docRows) {
      if (doc.doctor_missed_flags && Array.isArray(doc.doctor_missed_flags)) {
        missedFlags.push(...doc.doctor_missed_flags.map(f => ({
          ...f,
          docDate: doc.document_date,
          docType: doc.document_type,
        })));
      }
    }
  }
  if (missedFlags.length > 0) ctx.doctorMissedFlags = missedFlags;

  // Recommendation compliance — what was recommended and what they did about it
  if (recRows && recRows.length > 0) {
    const pending = recRows.filter(r => r.status === 'pending');
    const doing = recRows.filter(r => r.status === 'doing');
    const notDoing = recRows.filter(r => r.status === 'not_doing');
    const triedNotWorking = recRows.filter(r => r.status === 'tried_not_working');
    const resolved = recRows.filter(r => r.status === 'resolved');
    ctx.recommendations = { pending, doing, notDoing, triedNotWorking, resolved, all: recRows };
  }

  // Recent check-ins — how they're actually feeling and what's blocking them
  if (checkinRows && checkinRows.length > 0) {
    ctx.recentCheckins = checkinRows;
    const latest = checkinRows[0];
    ctx.latestCheckin = latest;
  }

  return Object.keys(ctx).length > 0 ? ctx : null;
}

// Format intelligence context for inclusion in AI prompts.
// Returns a compact but information-dense string the model can reason from.
export function formatIntelligenceForPrompt(intel) {
  if (!intel) return '';
  const parts = [];

  if (intel.supplements) {
    parts.push(`ACTIVE SUPPLEMENTS: ${intel.supplements}`);
  }

  if (intel.biologicalAge) {
    const bio = intel.biologicalAge;
    const gapStr = bio.gap != null
      ? (parseFloat(bio.gap) < 0
          ? `${Math.abs(bio.gap)} years younger than calendar age`
          : parseFloat(bio.gap) > 0
            ? `${bio.gap} years older than calendar age`
            : 'at chronological age')
      : '';
    const trendStr = bio.trend != null
      ? (parseFloat(bio.trend) < 0
          ? ` — IMPROVING (trending ${Math.abs(bio.trend)} years younger)`
          : parseFloat(bio.trend) > 0
            ? ` — WORSENING (trending ${bio.trend} years older)`
            : '')
      : '';
    parts.push(`BIOLOGICAL AGE: ${bio.current} (${gapStr}${trendStr}) | Trajectory: ${bio.trajectory}`);
  }

  if (intel.doctorMissedFlags && intel.doctorMissedFlags.length > 0) {
    const flags = intel.doctorMissedFlags
      .filter(f => f.severity === 'act' || f.severity === 'concern')
      .slice(0, 4)
      .map(f => `${f.marker} (${f.value}) — labeled normal but: ${f.why_concerning}`);
    if (flags.length > 0) {
      parts.push(`AELLUX FLAGS (missed by conventional analysis):\n${flags.join('\n')}`);
    }
  }

  if (intel.recommendations) {
    const { pending, doing, notDoing, triedNotWorking } = intel.recommendations;

    if (doing.length > 0) {
      parts.push(`CURRENTLY DOING (user confirmed): ${doing.map(r => r.recommendation).join(' | ')}`);
    }
    if (triedNotWorking.length > 0) {
      const details = triedNotWorking.map(r => `"${r.recommendation}"${r.user_note ? ' — user says: ' + r.user_note : ''}`);
      parts.push(`TRIED BUT NOT WORKING — DO NOT RE-RECOMMEND WITHOUT ESCALATION: ${details.join(' | ')}`);
    }
    if (notDoing.length > 0) {
      const details = notDoing.map(r => `"${r.recommendation}"${r.user_note ? ' — reason: ' + r.user_note : ' (no reason given)'}`);
      parts.push(`NOT DOING (user declined) — if markers still require it, recommend again with escalated urgency and explain why skipping it is affecting their results: ${details.join(' | ')}`);
    }
    if (pending.length > 0) {
      // Only include pending items targeting markers that are still out of range
      const unresolved = pending.filter(r => r.target_marker).map(r => r.recommendation);
      if (unresolved.length > 0) {
        parts.push(`PREVIOUSLY RECOMMENDED (compliance unknown — markers may still need this): ${unresolved.slice(0, 5).join(' | ')}`);
      }
    }
  }

  if (intel.latestCheckin) {
    const c = intel.latestCheckin;
    const score = c.protocol_followed;
    const compliance = score >= 4 ? 'high compliance' : score >= 2 ? 'partial compliance' : 'low compliance';
    const blockerStr = c.blockers ? ` Blockers reported: "${c.blockers}"` : '';
    parts.push(`LATEST PROTOCOL CHECK-IN (week of ${c.week_start}): ${compliance} (${score}/5 protocol adherence), energy ${c.energy_level}/5, sleep ${c.sleep_quality}/5, mood ${c.mood}/5.${blockerStr}`);
    if (score && score < 3) {
      parts.push(`LOW COMPLIANCE DETECTED: Adjust recommendations to address their reported blockers. Make the protocol more achievable. Identify the 1-2 highest-leverage changes and lead with those.`);
    }
  }

  return parts.length > 0
    ? `\n\n=== ACCUMULATED INTELLIGENCE (factor this into every recommendation) ===\n${parts.join('\n')}`
    : '';
}
