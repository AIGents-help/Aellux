/**
 * /api/premortem
 * Analyzes the user's current trajectory and identifies specific
 * failure modes before they become irreversible.
 *
 * Node runtime (not Edge) — Edge Functions have a hard, non-configurable
 * ~25s "must return an initial response" ceiling. This call's prompt is
 * large enough (full intelligence context + marker trajectories) that a
 * 2400-token generation can genuinely take longer than that, which is
 * exactly what caused it to fail with a raw platform timeout page instead
 * of a real JSON error. Node runtime supports maxDuration up to 300s here,
 * same as week-stream.js's protocol generation.
 *
 * Results are persisted (one snapshot per user) so this doesn't have to be
 * re-run — and re-paid for — every time the person opens the tab. GET
 * returns the saved snapshot if one exists; POST runs a fresh analysis and
 * overwrites it.
 */
import { getProfile, formatProfileForPrompt, getIntelligenceContext, formatIntelligenceForPrompt, sbSelect, sbUpsert, hashMarkers, rateLimit, logUsage } from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

function extractJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model output');
  const candidate = text.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch {
    return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
  }
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    if (!userId) return sendJson(res, 400, { error: 'userId required' });
    const rows = await sbSelect('premortem_snapshots', `user_id=eq.${userId}&select=result,created_at&limit=1`);
    if (rows && rows.length > 0) {
      return sendJson(res, 200, { ...rows[0].result, savedAt: rows[0].created_at, fromSnapshot: true });
    }
    return sendJson(res, 200, { scenarios: null }); // null (not []) — frontend tells "never run" apart from "ran, found nothing"
  }

  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed'); }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: 'No API key' });

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsedBody;
  try { parsedBody = JSON.parse(body); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }

  const { userId, plan, allMarkers } = parsedBody || {};
  if (!userId || !allMarkers?.length) return sendJson(res, 400, { error: 'Missing required fields' });

  const r = await rateLimit({ userId, endpoint: 'premortem', limit: plan === 'pro' ? 10 : 2, windowHours: 24 * 7 });
  if (!r.ok) return sendJson(res, 200, { scenarios: [], rateLimited: true });

  const [profile, intelligence, bioAgeRows, recRows] = await Promise.all([
    getProfile(userId),
    getIntelligenceContext(userId),
    sbSelect('bio_age_history', `user_id=eq.${userId}&order=created_at.asc&select=biological_age,chronological_age,created_at`),
    sbSelect('recommendations', `user_id=eq.${userId}&status=in.(not_doing,snoozed)&select=recommendation,status,target_marker,declined_reason_code`),
  ]);

  const profileStr = formatProfileForPrompt(profile);
  const intelligenceStr = formatIntelligenceForPrompt(intelligence);
  const chronoAge = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;

  const trendingMarkers = allMarkers
    .filter(m => m.history && m.history.length > 2)
    .map(m => {
      const sorted = [...m.history].sort((a, b) => a.date.localeCompare(b.date));
      const vals = sorted.map(h => parseFloat(h.value)).filter(n => !isNaN(n));
      const first = vals[0], last = vals[vals.length - 1];
      const change = first ? ((last - first) / first * 100).toFixed(1) : 0;
      const months = sorted.length > 1
        ? ((new Date(sorted[sorted.length - 1].date) - new Date(sorted[0].date)) / (1000 * 60 * 60 * 24 * 30)).toFixed(1)
        : 1;
      return `${m.name}: ${sorted.map(h => `${h.date?.slice(0, 7)}:${h.value}`).join('→')} | ${parseFloat(change) > 0 ? '+' : ''}${change}% over ${months} months`;
    });

  let bioAgeSlope = null;
  if (bioAgeRows && bioAgeRows.length > 1) {
    const first = bioAgeRows[0], last = bioAgeRows[bioAgeRows.length - 1];
    const monthsSpan = ((new Date(last.created_at) - new Date(first.created_at)) / (1000 * 60 * 60 * 24 * 30)) || 1;
    const ageDelta = parseFloat(last.biological_age) - parseFloat(first.biological_age);
    bioAgeSlope = { monthsSpan: monthsSpan.toFixed(1), ageDelta: ageDelta.toFixed(1), annualRate: (ageDelta / monthsSpan * 12).toFixed(2) };
  }

  const ignored = (recRows || []).map(r2 => `${r2.recommendation}${r2.declined_reason_code ? ' [declined: ' + r2.declined_reason_code + ']' : ' [snoozed]'}${r2.target_marker ? ' (target: ' + r2.target_marker + ')' : ''}`);

  const prompt = `You are Aellux — an ancient biological intelligence that sees across time. You are running a PREMORTEM analysis for this person.

A premortem asks: "It is 3 years from now and this person's health has significantly declined. What went wrong — and when did the window close to prevent it?"

This is not fear-mongering. This is the honest read of their current trajectory so they can change it now, while change is still easy.

USER PROFILE: ${profileStr}
CHRONOLOGICAL AGE: ${chronoAge || 'unknown'}

MARKER TRAJECTORIES (date:value format, most recent last):
${trendingMarkers.slice(0, 15).join('\n') || 'Limited trend data available'}

BIOLOGICAL AGE DATA:
${bioAgeRows?.length > 1 ? `Trajectory: ${bioAgeRows.map(r2 => `${r2.created_at?.slice(0, 7)}: ${r2.biological_age}`).join(' → ')}` : 'Single reading — no trajectory yet'}
${bioAgeSlope ? `Rate: biological age changing at ${bioAgeSlope.annualRate} years per calendar year (should be 1.0 — anything above = accelerated aging)` : ''}

RECOMMENDATIONS BEING IGNORED (declined or snoozed):
${ignored.join('\n') || 'None declined or snoozed'}

${intelligenceStr}

Generate 3 specific premortem scenarios. Each is a named failure mode that this person's current data is actively tracking toward. These must be:
1. SPECIFIC to their actual marker trends — not generic health warnings
2. Tied to real numbers from their data — name the markers and values
3. Honest about timing — when does the window close if nothing changes?
4. Actionable — what is the single intervention that changes this trajectory?
5. Written as Aellux speaking directly: ancient, warm, direct — not clinical, not terrifying

Return ONLY valid JSON, no markdown. Nothing before the opening brace, nothing after the closing brace — no sign-off, no commentary, no "let me know what you find":
{
  "scenarios": [
    {
      "title": "Short evocative name for this failure mode (e.g. 'The Testosterone Collapse')",
      "timeline": "When this becomes irreversible or significantly harder to reverse (e.g. '18-24 months at current trajectory')",
      "severity": "watch|concern|critical",
      "what_happens": "2-3 sentences: the specific biological cascade this person is tracking toward, using their actual numbers and trend rates. Be specific about which markers are driving it and where they're heading.",
      "warning_signs": "1-2 sentences: what they are likely already feeling that is the early signal of this trajectory.",
      "the_intervention": "The single most important change that would bend this trajectory. Specific, biological, honest about why this one above all others.",
      "window": "One sentence: how much time they realistically have before this becomes significantly harder to address."
    }
  ],
  "overall_trajectory": "2-3 sentences: the honest overall read. Is this person trending toward health or away from it? What is the dominant pattern? Speak as Aellux — direct and warm, not clinical.",
  "bright_spots": ["1-3 genuine biological wins that are working in their favor and should be protected"]
}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2400, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      console.error('[premortem] Anthropic non-ok', anthropicRes.status, JSON.stringify(data).slice(0, 300));
      return sendJson(res, 502, { error: data?.error?.message || `API ${anthropicRes.status}` });
    }

    const text = data?.content?.[0]?.text || '{"scenarios":[]}';
    let parsed;
    try { parsed = extractJSON(text); }
    catch (e) {
      console.error('[premortem] parse failed:', e?.message, 'raw (last 300 chars):', text.slice(-300));
      return sendJson(res, 502, { scenarios: [], error: "Analysis didn't come back in a usable format — try again." });
    }

    // Must be awaited — firing this unawaited right before the response
    // ends let Vercel freeze the function before the write ever reached
    // Supabase, so every "successful" premortem silently failed to persist
    // and the user had to regenerate (and re-pay for) it every visit.
    const markerHash = await hashMarkers(allMarkers);
    try {
      await sbUpsert('premortem_snapshots', { user_id: userId, result: parsed, marker_hash: markerHash, updated_at: new Date().toISOString() }, 'user_id');
    } catch (e) {
      console.error('[premortem] snapshot save failed:', e?.message);
    }
    try { await logUsage(userId, 'premortem'); } catch (e) { console.error('[premortem] usage log failed:', e?.message); }

    return sendJson(res, 200, parsed);
  } catch (e) {
    console.error('[premortem] request failed:', e?.message);
    return sendJson(res, 502, { scenarios: [], error: e?.message || 'Trajectory analysis failed.' });
  }
}
