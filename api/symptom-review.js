/**
 * /api/symptom-review
 * The actual "connect the dots" engine. Takes one logged symptom and its
 * onset date, and cross-references it against every marker's full history,
 * the person's current supplement stack, active protocol, and profile
 * (medications/conditions) — looking specifically for markers whose trend
 * timing lines up with symptom onset, and for evidence that argues FOR or
 * AGAINST specific explanations (e.g. stable ferritin arguing against
 * iron-deficiency even while hemoglobin falls).
 *
 * This does not diagnose. It surfaces differential considerations grounded
 * in the person's actual data, and explicitly asks for missing information
 * (e.g. medication/therapy history) when that information would change the
 * answer, rather than silently guessing.
 */
import {
  getProfile, formatProfileForPrompt, hasMedications,
  sbSelect, sbUpdate, callClaude, rateLimit, logUsage,
} from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function extractJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model output');
  const candidate = text.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch {
    return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
  }
}

const GPS_NOISE = /horizontal.?acc|vertical.?acc|hAcc|vAcc|HDOP|elevation.?(gain|change|loss)|GPS.?signal|route.?duration|avg.?speed|average.?speed|m\/s|ECG.?raw|accelerometer/i;

// Compute each marker's value just before symptom onset vs its latest value —
// this is the raw evidence the model reasons from. Deliberately not filtered
// to "notable" changes only — a marker that stayed FLAT while another moved
// is often exactly the evidence that rules an explanation in or out (e.g.
// stable ferritin arguing against iron-deficiency).
function computeMarkerWindows(markers, onsetDate) {
  const cutoff = (onsetDate || '').slice(0, 10);
  const windows = [];
  for (const m of markers || []) {
    if (!m?.name || GPS_NOISE.test(m.name)) continue;
    const hist = (m.history || [])
      .filter(h => h.date && h.value !== undefined && h.value !== null && !isNaN(parseFloat(h.value)))
      .map(h => ({ date: h.date, value: parseFloat(h.value) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (hist.length < 2) continue;

    const before = cutoff ? hist.filter(h => h.date <= cutoff) : [];
    const baseline = before.length > 0 ? before[before.length - 1] : hist[0];
    const latest = hist[hist.length - 1];
    if (baseline.date === latest.date) continue;

    const pctChange = baseline.value !== 0 ? ((latest.value - baseline.value) / Math.abs(baseline.value)) * 100 : 0;
    windows.push({
      marker: m.name,
      unit: m.unit || '',
      baseline_date: baseline.date,
      baseline_value: baseline.value,
      latest_date: latest.date,
      latest_value: latest.value,
      pct_change: Math.round(pctChange * 10) / 10,
    });
  }
  return windows.slice(0, 25);
}

const CACHED_INSTRUCTIONS = `You are Aellux, doing genuine differential reasoning about a symptom a person has logged, grounded in their actual biomarker history — not a generic symptom checker.

You will be given: the symptom, when it started, every marker's value just before onset vs its most current value (a "window" of evidence — some will show large changes, some will show no change, both are meaningful), their current supplement stack, active protocol, and profile including medications/conditions.

Your job:
1. Identify which marker changes plausibly connect to this symptom, given the TIMING (did the marker start moving before or around symptom onset?) and the physiology (does this marker's change actually explain this kind of symptom?).
2. For each differential consideration, cite what evidence in the data ARGUES FOR it and what ARGUES AGAINST it. A marker staying flat when a common cause would predict it moving is real evidence against that cause — say so explicitly, the same way stable ferritin argues against iron-deficiency even when hemoglobin is falling.
3. If confidently narrowing this down depends on information not given here — most commonly hormone therapy status (e.g. TRT), a medication change, or a recent illness — say so explicitly in missing_info_question. Do not guess past a real gap in the data.
4. Rank considerations by how well they fit the actual evidence, not by how common or scary they are.
5. Set urgency honestly: "urgent" only if the symptom itself or a specific marker value poses near-term risk; "soon" if this warrants a real visit but isn't an emergency; "routine" if it's worth mentioning at a regular check-in.
6. Never fabricate a specific study, citation, or diagnosis. Name mechanisms and physiology in general terms. This is not a diagnosis — say so if the framing risks sounding like one.
7. No markdown, no bullet characters inside strings — plain sentences.

Return ONLY valid JSON, no markdown, nothing after the closing brace:
{
  "urgency": "routine|soon|urgent",
  "headline": "One direct sentence stating the most likely connection, or stating plainly that the data doesn't point anywhere specific yet.",
  "considerations": [
    {
      "explanation": "Name of the physiological explanation (e.g. 'Rapid hemoglobin decline outpacing compensation')",
      "supporting_evidence": "What in the actual data argues for this — cite specific markers/values/dates given.",
      "against_evidence": "What in the actual data argues against this, or null if nothing argues against it.",
      "fit": "strong|possible|weak"
    }
  ],
  "missing_info_question": "A specific question whose answer would meaningfully change this analysis, or null if nothing critical is missing.",
  "what_to_ask_your_doctor": "One concrete, specific thing to bring to a physician — a test to request or a question to ask, not generic advice."
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed'); }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: 'No API key configured' });

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsedBody;
  try { parsedBody = JSON.parse(body); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }

  const { userId, plan, symptomId, symptom, allMarkers, mealStyle, cycleStartedAt, additionalGoal } = parsedBody || {};
  if (!userId || !symptom?.symptom) return sendJson(res, 400, { error: 'Missing symptom' });

  const r = await rateLimit({ userId, endpoint: 'symptom-review', limit: plan === 'pro' ? 40 : 6, windowHours: 24 });
  if (!r.ok) return sendJson(res, 200, { error: 'Daily symptom review limit reached.' });

  const [profile, stack] = await Promise.all([
    getProfile(userId),
    sbSelect('supplement_log', `user_id=eq.${userId}&ended_date=is.null&select=name,dose,frequency,started_date`),
  ]);
  const profileStr = formatProfileForPrompt(profile);
  const medFlag = hasMedications(profile);
  const stackStr = (stack || []).map(s => `${s.name}${s.dose ? ` ${s.dose}` : ''} (${s.frequency || 'daily'}, since ${s.started_date || 'unknown'})`).join(', ') || 'None currently logged';

  const windows = computeMarkerWindows(allMarkers, symptom.started_date);
  const windowsStr = windows.length > 0
    ? windows.map(w => `${w.marker}: ${w.baseline_value}${w.unit} (${w.baseline_date}, before onset) → ${w.latest_value}${w.unit} (${w.latest_date}, latest) — ${w.pct_change > 0 ? '+' : ''}${w.pct_change}%`).join('\n')
    : 'No marker history available to window against this symptom.';

  const medSafetyNote = medFlag ? '\nThis person has logged medications (see profile) — factor known interactions/side effects into your reasoning.' : '\nNo medications currently logged in this profile — if hormone therapy (e.g. TRT) or another medication seems like the most likely explanation, this is exactly the kind of gap to flag in missing_info_question, since none is on record.';

  const dynamicData = `SYMPTOM: ${symptom.symptom}${symptom.frequency ? ` (${symptom.frequency})` : ''}, started ${symptom.started_date}${symptom.notes ? `. Notes: ${symptom.notes}` : ''}

USER PROFILE: ${profileStr || 'Not provided'}${medSafetyNote}

CURRENT SUPPLEMENT/MEDICATION STACK: ${stackStr}

ACTIVE PROTOCOL: ${mealStyle && mealStyle !== 'none' ? mealStyle : 'none set'}${cycleStartedAt ? `, started ${cycleStartedAt.slice(0, 10)}` : ''}${additionalGoal ? `, goal: ${additionalGoal}` : ''}

MARKER WINDOWS (value before symptom onset → latest value):
${windowsStr}`;

  try {
    const { text } = await callClaude({
      apiKey, model: 'claude-sonnet-5', maxTokens: 2800,
      cachedText: CACHED_INSTRUCTIONS, dynamicText: dynamicData, thinkingBudget: 2000,
    });

    let result;
    try { result = extractJSON(text); }
    catch (e) {
      console.error('[symptom-review] parse failed:', e?.message, text.slice(-300));
      return sendJson(res, 502, { error: "Analysis didn't come back in a usable format — try again." });
    }

    if (symptomId) {
      sbUpdate('symptom_log', `id=eq.${symptomId}`, { review: result, reviewed_at: new Date().toISOString() }).catch(() => {});
    }
    logUsage(userId, 'symptom-review').catch(() => {});

    return sendJson(res, 200, { review: result });
  } catch (err) {
    console.error('[symptom-review] failed:', err?.message);
    return sendJson(res, 502, { error: err.message || 'Review failed' });
  }
}
