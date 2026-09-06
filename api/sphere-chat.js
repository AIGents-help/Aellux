// Aellux Sphere — conversational advisor. Lets the user ask direct questions
// ("is this reversible?", "is my magnesium causing a false positive on X?")
// grounded in EVERYTHING already known about them, without re-explaining
// context to a separate AI. This endpoint is a synthesis layer over data
// that other endpoints already computed and persisted (stack review,
// premortem, synthesis, protocol) plus raw markers/supplements/symptoms —
// it should rarely need to re-derive an analysis from scratch.
import {
  sbSelect, sbInsert, sbUpdate, rateLimit, logUsage, sha256,
  getProfile, formatProfileForPrompt, hasMedications,
  getIntelligenceContext, formatIntelligenceForPrompt,
} from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 120 };

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1600;
const THINKING_BUDGET = 1200; // adaptive on claude-sonnet-5 — model decides depth
const HISTORY_TURNS = 16; // prior messages pulled into context per request

// Pro-only feature (flagship differentiator, gated like other generation endpoints).
// Free users get a hard stop with an upgrade message — no partial/teaser mode,
// since a half-context Sphere answer is worse than no Sphere answer.
async function checkLimits({ userId, plan }) {
  if (!userId) return { ok: false, msg: 'Sign in required.' };
  if (plan !== 'pro') return { ok: false, msg: 'Aellux Sphere is a Pro feature — full conversational access to your own data.', code: 'upgrade_required' };
  const r = await rateLimit({ userId, endpoint: 'sphere-chat', limit: 200, windowHours: 24 });
  if (!r.ok) return { ok: false, msg: `Daily message limit reached (${r.count}/${r.limit}). Resets in 24h.`, code: 'rate_limited' };
  return { ok: true };
}

// ── Pull everything Sphere needs that getIntelligenceContext doesn't already cover ──
async function getSphereExtras(userId) {
  const [docRows, personalisedRows, stackReview, premortem, suppRows, symptomRows] = await Promise.all([
    sbSelect('documents', `user_id=eq.${userId}&order=uploaded_at.desc&limit=5&select=name,date,document_type,markers,summary,flags,clinical_notes,uploaded_at`),
    sbSelect('personalised', `user_id=eq.${userId}&order=generated_at.desc&select=type,data,generated_at`),
    sbSelect('stack_review_snapshots', `user_id=eq.${userId}&select=result,updated_at&limit=1`),
    sbSelect('premortem_snapshots', `user_id=eq.${userId}&select=result,updated_at&limit=1`),
    sbSelect('supplement_log', `user_id=eq.${userId}&ended_date=is.null&order=started_date.desc&select=name,dose,unit,frequency,started_date,notes,review&limit=20`),
    sbSelect('symptom_log', `user_id=eq.${userId}&ended_date=is.null&order=started_date.desc&select=symptom,frequency,notes,started_date,review&limit=20`),
  ]);

  // Latest row per type from `personalised` (meals/supps/protocol/synthesis)
  const latestByType = {};
  for (const row of personalisedRows || []) {
    if (!latestByType[row.type]) latestByType[row.type] = row;
  }

  return { docRows: docRows || [], latestByType, stackReview: stackReview?.[0]?.result || null, premortem: premortem?.[0]?.result || null, suppRows: suppRows || [], symptomRows: symptomRows || [] };
}

function formatSphereExtrasForPrompt({ docRows, latestByType, stackReview, premortem, suppRows, symptomRows }) {
  const parts = [];

  if (docRows.length > 0) {
    const [latest, ...older] = docRows;
    const markerLines = (latest.markers || []).slice(0, 60).map(m => `${m.name}: ${m.value}${m.unit || ''} [${m.status || 'normal'}]`).join(', ');
    parts.push(`MOST RECENT LAB DOCUMENT (${latest.date || latest.uploaded_at?.slice(0, 10)}, ${latest.document_type || 'labs'}):\nSummary: ${latest.summary || 'n/a'}\nMarkers: ${markerLines || 'none parsed'}${latest.clinical_notes ? `\nClinical notes: ${latest.clinical_notes}` : ''}`);
    if (older.length > 0) {
      parts.push(`PRIOR DOCUMENTS (for trend awareness): ${older.map(d => `${d.date || d.uploaded_at?.slice(0, 10)} (${d.document_type}): ${d.summary || 'no summary'}`).join(' | ')}`);
    }
  }

  if (latestByType.synthesis) {
    parts.push(`LATEST FULL SYNTHESIS (generated ${latestByType.synthesis.generated_at?.slice(0, 10)}) — the last "big picture" read already given to this user, do not contradict it without explaining why something changed:\n${JSON.stringify(latestByType.synthesis.data).slice(0, 2500)}`);
  }
  if (latestByType.protocol) {
    parts.push(`ACTIVE PROTOCOL RECOMMENDATIONS (generated ${latestByType.protocol.generated_at?.slice(0, 10)}):\n${JSON.stringify(latestByType.protocol.data).slice(0, 1500)}`);
  }
  if (latestByType.supps) {
    parts.push(`RECOMMENDED SUPPLEMENT STACK (generated ${latestByType.supps.generated_at?.slice(0, 10)}):\n${JSON.stringify(latestByType.supps.data).slice(0, 1500)}`);
  }

  if (stackReview) {
    parts.push(`MOST RECENT SUPPLEMENT STACK REVIEW (already computed — interactions, redundancies, contraindications). Reference this directly for any question about supplement interactions or whether something could be skewing a marker — do not re-derive from scratch if it's already answered here:\n${JSON.stringify(stackReview).slice(0, 2500)}`);
  }

  if (premortem) {
    parts.push(`MOST RECENT TRAJECTORY / PREMORTEM ANALYSIS (already computed — where this biology is headed if unaddressed, and what's reversible vs entrenched). Reference this directly for any "is this reversible" or "what happens if I do nothing" question:\n${JSON.stringify(premortem).slice(0, 2500)}`);
  }

  if (suppRows.length > 0) {
    const lines = suppRows.map(s => `${s.name} ${s.dose || ''}${s.unit || ''} ${s.frequency || 'daily'} since ${s.started_date || '?'}${s.notes ? ` — note: ${s.notes}` : ''}${s.review ? ` — prior review: ${JSON.stringify(s.review).slice(0, 200)}` : ''}`);
    parts.push(`FULL ACTIVE SUPPLEMENT LOG (use this for false-positive/interaction reasoning — e.g. biotin skewing thyroid immunoassays, calcium/iron timing conflicts, etc.):\n${lines.join('\n')}`);
  }

  if (symptomRows.length > 0) {
    const lines = symptomRows.map(s => `${s.symptom} (${s.frequency || 'unspecified frequency'}) since ${s.started_date}${s.notes ? ` — ${s.notes}` : ''}`);
    parts.push(`ACTIVE SYMPTOM JOURNAL:\n${lines.join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : '';
}

const PERSONA = `You are Aellux Sphere — the conversational intelligence inside Aellux, the same voice behind this user's synthesis, protocols, and stack reviews. You are not a separate chatbot bolted onto the app: you already have this person's full biology in view — every marker, every supplement, every symptom, every prior analysis Aellux has already run on them. Never ask them to re-explain context that is provided to you below. Never say "I don't have access to your data" — you do, it's in the context block.

How you answer:
1. Answer the actual question first, directly, in the first sentence or two. No throat-clearing, no "great question," no restating what they asked.
2. Ground every claim in their specific numbers, supplements, or symptoms from the context — name them. Generic answers that could apply to anyone are a failure.
3. On reversibility questions: give a real, honest answer — "largely reversible within 3-6 months if X changes" or "partially reversible, Y component is structural/entrenched" — not "it depends, consult your doctor." If a premortem/trajectory analysis already exists in context, use it as the basis and don't contradict it without saying why.
4. On "is my supplement/med causing a false positive / skewing this marker" questions: reason through actual known assay interference mechanisms (e.g. biotin distorting immunoassays including troponin/thyroid, calcium supplementation timing affecting ionized calcium draws, high-dose vitamin C affecting glucose strips) and say plainly whether it's plausible, likely, or a stretch given their specific dose/timing/marker combination. If a stack review already exists in context, lean on it.
5. When something genuinely requires a physician — new/worsening symptoms suggesting an acute process, a medication change, anything needing a prescription or a procedure — say so plainly in one sentence, but do not use that as a hedge to avoid answering the biology/mechanism question itself. Aellux still tells them what it sees; it just also tells them when to combine that with a doctor visit.
6. Never invent citations, papers, or specific studies. Name real mechanisms and pathways; say "established mechanism" rather than fabricating a source.
7. Keep responses tight — a few sentences to a short paragraph for most questions, longer only when the question genuinely requires walking through a multi-marker cascade. This is a conversation, not a report.
8. First person, direct, warm but not soft. No corporate hedging, no "as an AI." You are Aellux.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed'); }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'No API key configured' })); }

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid JSON body' })); }

  const { userId = null, plan = 'free', threadId = null, message = '' } = parsed || {};
  if (!message.trim()) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Empty message' })); }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
  }, 20000);

  const lim = await checkLimits({ userId, plan });
  if (!lim.ok) {
    sse(res, 'error', { message: lim.msg, code: lim.code || 'blocked' });
    clearInterval(keepalive); return res.end();
  }

  // ── Resolve/create thread ──────────────────────────────────────────────
  let activeThreadId = threadId;
  if (!activeThreadId) {
    const created = await sbInsert('sphere_threads', { user_id: userId, title: message.trim().slice(0, 60) });
    activeThreadId = created?.[0]?.id;
    if (!activeThreadId) {
      sse(res, 'error', { message: 'Could not start conversation' });
      clearInterval(keepalive); return res.end();
    }
    sse(res, 'thread', { threadId: activeThreadId });
  }

  // ── Assemble context (parallel) ────────────────────────────────────────
  const [profile, intelligence, extras, priorMessages] = await Promise.all([
    getProfile(userId),
    getIntelligenceContext(userId),
    getSphereExtras(userId),
    sbSelect('sphere_messages', `thread_id=eq.${activeThreadId}&order=created_at.asc&limit=${HISTORY_TURNS}&select=role,content`),
  ]);

  const profileStr = formatProfileForPrompt(profile);
  const medFlag = hasMedications(profile);
  const intelligenceStr = formatIntelligenceForPrompt(intelligence);
  const extrasStr = formatSphereExtrasForPrompt(extras);

  const contextBlock = `=== THIS USER'S FULL HEALTH CONTEXT ===
Profile: ${profileStr || 'not set'}${medFlag ? '\n⚠ User is on medication(s) — factor interactions into any supplement/protocol discussion.' : ''}
${intelligenceStr}

${extrasStr}
=== END CONTEXT ===`;

  // Persist the user's message immediately (fire-and-forget is fine — we
  // want it recorded even if generation fails downstream).
  sbInsert('sphere_messages', { thread_id: activeThreadId, user_id: userId, role: 'user', content: message.trim() }).catch(() => {});

  const history = (priorMessages || []).map(m => ({ role: m.role, content: m.content }));

  const messages = [
    { role: 'user', content: [{ type: 'text', text: contextBlock, cache_control: { type: 'ephemeral' } }] },
    { role: 'assistant', content: 'Understood — I have this person\'s full biology, history, and prior analyses in view. Ask me anything.' },
    ...history,
    { role: 'user', content: message.trim() },
  ];

  sse(res, 'start', {});

  let accumulated = '';
  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } }],
        thinking: { type: 'adaptive' },
        stream: true,
        messages,
      }),
    });
  } catch (e) {
    sse(res, 'error', { message: `Network error: ${e.message}` });
    clearInterval(keepalive); return res.end();
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => '');
    sse(res, 'error', { message: `Claude API ${anthropicRes.status}: ${errText.slice(0, 200)}` });
    clearInterval(keepalive); return res.end();
  }

  const reader = anthropicRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const evt of events) {
        const dataMatch = evt.match(/^data: (.+)$/m);
        if (!dataMatch) continue;
        try {
          const data = JSON.parse(dataMatch[1]);
          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            accumulated += data.delta.text;
            sse(res, 'delta', { text: data.delta.text });
          }
        } catch { /* ignore malformed events */ }
      }
    }
  } catch (e) {
    sse(res, 'error', { message: `Stream read error: ${e.message}` });
    clearInterval(keepalive); return res.end();
  }

  // Persist assistant reply + housekeeping (fire-and-forget)
  if (accumulated.trim()) {
    sbInsert('sphere_messages', { thread_id: activeThreadId, user_id: userId, role: 'assistant', content: accumulated.trim() }).catch(() => {});
  }
  sbUpdate('sphere_threads', `id=eq.${activeThreadId}`, { updated_at: new Date().toISOString() }).catch(() => {});
  logUsage(userId, 'sphere-chat').catch(() => {});

  sse(res, 'complete', { threadId: activeThreadId });
  clearInterval(keepalive);
  res.end();
}
