// Shared helpers for edge functions. No npm imports — uses fetch + Web Crypto.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dpweejtslbzmstcywcnl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── SHIFTED bridge — HMAC sign/verify ────────────────────────────────────────
// Keyed (not plain-hash) signatures for the cross-app grant/callback handshake.
// Both sides hold SHIFTED_BRIDGE_SECRET; nothing else can mint a valid grant.
async function bridgeKey() {
  const secret = process.env.SHIFTED_BRIDGE_SECRET || '';
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function hmacSign(payload) {
  const key = await bridgeKey();
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacVerify(payload, signatureHex) {
  if (!signatureHex) return false;
  const expected = await hmacSign(payload);
  if (expected.length !== signatureHex.length) return false;
  // Constant-time compare — avoid leaking match length via early-exit timing.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  return diff === 0;
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

export async function sbDelete(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
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

// ── Claude API helper — prompt caching + extended thinking ──────────────────
// `cachedText` should be the STATIC part of a prompt (identical across calls —
// instructions, schemas, philosophy) so Anthropic can cache and reuse it.
// `dynamicText` is the per-request part (user's actual markers/profile/data).
// Pass `thinkingBudget` to enable extended thinking for calls that need deeper
// cross-marker reasoning (contraindication checks, cascade analysis) — omit it
// for fast/cheap calls where latency matters more than depth.
// Models that only support adaptive thinking (no budget_tokens) — using the
// older manual "enabled" format against these returns a 400 invalid_request_error.
// Haiku 4.5 is the one model still on manual/"Extended" thinking; everything
// newer than that has moved to adaptive-only.
const ADAPTIVE_THINKING_MODELS = ['claude-sonnet-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-mythos-5-1'];

export async function callClaude({ apiKey, model, maxTokens, system, cachedText, dynamicText, thinkingBudget }) {
  const userContent = [];
  if (cachedText) userContent.push({ type: 'text', text: cachedText, cache_control: { type: 'ephemeral' } });
  if (dynamicText) userContent.push({ type: 'text', text: dynamicText });

  const payload = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userContent.length ? userContent : (dynamicText || cachedText || '') }],
  };
  if (system) payload.system = system;
  if (thinkingBudget) {
    payload.thinking = ADAPTIVE_THINKING_MODELS.includes(model)
      ? { type: 'adaptive' }
      : { type: 'enabled', budget_tokens: thinkingBudget };
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err = new Error(`Claude API ${res.status}: ${errText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  // Extended thinking returns a `thinking` block before the `text` block —
  // find by type rather than assuming content[0].
  const textBlock = (data.content || []).find(b => b.type === 'text');
  return {
    text: textBlock?.text || '',
    raw: data,
    usage: data.usage || {},
  };
}

// ── Citation grounding (PubMed) ──────────────────────────────────────────────
// Free, no-API-key NCBI E-utilities. Used to ground "mechanism" claims in real
// abstracts instead of letting the model produce plausible-sounding but
// unverifiable citations. Best-effort: any failure here should never break
// the calling endpoint — grounding is an enhancement, not a dependency.
export async function pubmedSearch(query, maxResults = 2) {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=relevance&retmode=json`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const pmids = searchData?.esearchresult?.idlist || [];
    if (pmids.length === 0) return [];

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=text`;
    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) return [];
    const raw = await fetchRes.text();

    // MEDLINE plain-text abstracts are separated by blank-line-delimited blocks,
    // each numbered "1.", "2.", etc. — split on that rather than parsing XML.
    const blocks = raw.split(/\n\d+\.\s/).filter(Boolean);
    return blocks.slice(0, pmids.length).map((block, i) => ({
      pmid: pmids[i],
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmids[i]}/`,
      text: block.replace(/\s+/g, ' ').trim().slice(0, 600),
    })).filter(b => b.text.length > 40);
  } catch {
    return []; // grounding is best-effort — never let a PubMed hiccup break synthesis
  }
}

export function formatCitationsForPrompt(citations) {
  if (!citations || citations.length === 0) return '';
  return `\n\nREAL SOURCE MATERIAL — you may cite these by PMID if genuinely relevant to a specific claim, using format "PMID:12345678". Never cite a PMID not listed here. If nothing here is relevant to a given claim, say "Established biological mechanism" as usual rather than forcing a citation:\n${citations.map(c => `[PMID:${c.pmid}] ${c.text}`).join('\n\n')}`;
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

// ── SHIFTED chrono-context ────────────────────────────────────────────────────
// If the user has connected SHIFTED (public.shifted_connections), pull their
// live rotation/readiness/sleep-timing data server-to-server. Read-only, and
// silently returns null on any failure — a broken bridge should degrade to
// "no chrono-context" for this call, never break the underlying synthesis.
const SHIFTED_CONTEXT_URL = process.env.SHIFTED_CONTEXT_EXPORT_URL || 'https://companion.shifted.systems/api/aellux-context-export';

export async function getShiftedContext(userId) {
  if (!userId) return null;
  try {
    const rows = await sbSelect('shifted_connections', `user_id=eq.${userId}&status=eq.connected&select=shifted_user_id,grant_token_encrypted,grant_expires_at&limit=1`);
    const conn = rows && rows[0];
    if (!conn) return null;
    if (conn.grant_expires_at && new Date(conn.grant_expires_at) < new Date()) return null;

    const timestamp = Date.now().toString();
    const signature = await hmacSign(`${conn.shifted_user_id}.${timestamp}`);
    const res = await fetch(`${SHIFTED_CONTEXT_URL}?shifted_user_id=${encodeURIComponent(conn.shifted_user_id)}&ts=${timestamp}&sig=${signature}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    await sbUpdate('shifted_connections', `user_id=eq.${userId}`, { last_synced_at: new Date().toISOString() });
    return data; // expected shape: { schedule, live_phase, wake_anchor, measured_wake_drift: [...] }
  } catch {
    return null; // bridge down — degrade silently, never break the caller
  }
}

// ── Intelligence context ─────────────────────────────────────────────────────
// Pulls ALL accumulated intelligence for a user — doctor-missed flags,
// detected patterns, supplement log, bio age trajectory, correlation notes.
// Injected into every AI generation prompt so nothing is generated in isolation.
export async function getIntelligenceContext(userId) {
  if (!userId) return null;

  // Run all lookups in parallel
  const [suppRows, bioAgeRows, docRows, recRows, checkinRows, shiftedCtx] = await Promise.all([
    sbSelect('supplement_log', `user_id=eq.${userId}&ended_date=is.null&order=started_date.desc&select=name,dose,frequency,started_date&limit=10`),
    sbSelect('bio_age_history', `user_id=eq.${userId}&order=created_at.desc&limit=6&select=biological_age,chronological_age,gap_years,created_at`),
    sbSelect('documents', `user_id=eq.${userId}&select=doctor_missed_flags,document_date,document_type&limit=10`),
    sbSelect('recommendations', `user_id=eq.${userId}&order=created_at.desc&limit=20&select=recommendation,status,target_marker,target_direction,source,created_at,user_note`),
    sbSelect('checkins', `user_id=eq.${userId}&order=week_start.desc&limit=4&select=week_start,protocol_followed,energy_level,sleep_quality,mood,blockers`),
    getShiftedContext(userId),
  ]);

  const ctx = {};
  if (shiftedCtx) ctx.shifted = shiftedCtx;

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
    const snoozedRecs = recRows.filter(r => r.status === 'snoozed');
    ctx.recommendations = { pending, doing, notDoing, triedNotWorking, resolved, snoozed: snoozedRecs, all: recRows };
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

  if (intel.shifted) {
    const s = intel.shifted;
    const drift = Array.isArray(s.measured_wake_drift) && s.measured_wake_drift.length > 0
      ? s.measured_wake_drift.slice(0, 7).map(d => `${d.date}: measured ${d.measured_wake} vs stated anchor ${s.wake_anchor} (+${d.drift_hours}h)`).join('; ')
      : null;
    parts.push(
      `SHIFT SCHEDULE CONTEXT (from SHIFTED, powered by SHIFTED): ${s.schedule || 'schedule unknown'}. ` +
      `Stated wake anchor ${s.wake_anchor || 'unknown'}. Live phase: ${s.live_phase || 'unknown'}.` +
      (drift ? ` Measured wake-time drift vs stated anchor: ${drift}.` : '') +
      ` DIFFERENTIAL-PARITY RULE: shift work/circadian disruption may ONLY be cited as the cause of a finding when there is direct corroborating evidence for that specific finding (a measured sleep-timing or rhythm marker, e.g. the drift data above). For any distal marker (lipids, glucose, inflammatory, hormonal), give the strongest non-circadian explanation first and mention shift work only as a secondary, explicitly-indirect hypothesis if warranted. Never state "[finding] is caused by shift work" for a distal marker.`
    );
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
    const { pending, doing, notDoing, triedNotWorking, all } = intel.recommendations;
    const snoozed = (all || []).filter(r => r.status === 'snoozed');

    if (doing.length > 0) {
      parts.push(`CURRENTLY DOING (user accepted — track marker response): ${doing.map(r => r.recommendation).join(' | ')}`);
    }

    if (triedNotWorking.length > 0) {
      const details = triedNotWorking.map(r =>
        `"${r.recommendation}" (variant ${r.approach_variant || 1} already tried${r.user_note ? ', user says: ' + r.user_note : ''})`
      );
      parts.push(`TRIED BUT NOT WORKING — USE A COMPLETELY DIFFERENT MECHANISM, DIFFERENT APPROACH, DIFFERENT FRAMING. Do not repeat the same suggestion. Acknowledge they tried it: ${details.join(' | ')}`);
    }

    if (notDoing.length > 0) {
      const details = notDoing.map(r => {
        const variant = r.approach_variant || 1;
        const reason = r.declined_reason || r.user_note || 'no reason given';
        const code = r.declined_reason_code || '';
        return `"${r.recommendation}" declined ${variant} time(s). Reason: ${reason}${code ? ' [' + code + ']' : ''}. If marker still warrants it, suggest DIFFERENT MECHANISM addressing their stated reason.`;
      });
      parts.push(`USER DECLINED THESE — if markers still require action, re-approach with a different lever that addresses their reason for declining: ${details.join(' | ')}`);
    }

    if (snoozed.length > 0) {
      const details = snoozed.map(r => `"${r.recommendation}" (snoozed until ${r.snooze_until})`);
      parts.push(`SNOOZED — do not re-recommend unless target marker has worsened >15%: ${details.join(' | ')}`);
    }

    if (pending.length > 0) {
      const unresolved = pending.filter(r => r.target_marker).map(r => r.recommendation);
      if (unresolved.length > 0) {
        parts.push(`PENDING (not yet started — user hasn't committed): ${unresolved.slice(0, 5).join(' | ')}`);
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

// ── Healthcheck alerting ──────────────────────────────────────────────────────
// Fire a Slack/Discord-compatible webhook when something is broken.
// No-op if HEALTHCHECK_WEBHOOK_URL is not set, so this never breaks anything.
// Slack incoming webhooks and Discord (with /slack suffix) both accept this payload.
export async function sendAlert({ service, status, error, latency_ms, context }) {
  const url = process.env.HEALTHCHECK_WEBHOOK_URL;
  if (!url) return; // no webhook configured — silent no-op

  const emoji = status === 'down' ? '🔴' : status === 'degraded' ? '🟡' : '✅';
  const title = `${emoji} Aellux ${service} — ${status}`;
  const lines = [
    error ? `*Error:* \`${String(error).slice(0, 300)}\`` : null,
    latency_ms != null ? `*Latency:* ${latency_ms}ms` : null,
    context ? `*Context:* ${context}` : null,
    `*Time:* ${new Date().toISOString()}`,
    `*Env:* ${process.env.VERCEL_ENV || 'unknown'}`,
  ].filter(Boolean);

  const payload = { text: `${title}\n${lines.join('\n')}` };

  try {
    // 3s timeout so a slow webhook never blocks the healthcheck response
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3000);
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    clearTimeout(t);
  } catch (e) {
    // Alerting itself failing should never crash the caller
    console.error('[sendAlert] failed:', e?.message);
  }
}
