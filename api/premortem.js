/**
 * /api/premortem
 * Analyzes the user's current trajectory and identifies specific
 * failure modes before they become irreversible.
 * Three modes: marker_trajectory | compliance | bio_age
 */
import { getProfile, formatProfileForPrompt, getIntelligenceContext, formatIntelligenceForPrompt, sbSelect, rateLimit, logUsage, json } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, plan, allMarkers, mode = 'full' } = body || {};
  if (!userId || !allMarkers?.length) return json({ error: 'Missing required fields' }, { status: 400 });

  if (userId) {
    const r = await rateLimit({ userId, endpoint: 'premortem', limit: plan === 'pro' ? 10 : 2, windowHours: 24 * 7 });
    if (!r.ok) return json({ scenarios: [], rateLimited: true });
  }

  const [profile, intelligence, bioAgeRows, recRows] = await Promise.all([
    getProfile(userId),
    getIntelligenceContext(userId),
    sbSelect('bio_age_history', `user_id=eq.${userId}&order=created_at.asc&select=biological_age,chronological_age,created_at`),
    sbSelect('recommendations', `user_id=eq.${userId}&status=in.(not_doing,snoozed)&select=recommendation,status,target_marker,declined_reason_code`),
  ]);

  const profileStr = formatProfileForPrompt(profile);
  const intelligenceStr = formatIntelligenceForPrompt(intelligence);
  const chronoAge = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;

  // Build marker trajectory strings — only markers with history
  const trendingMarkers = allMarkers
    .filter(m => m.history && m.history.length > 2)
    .map(m => {
      const sorted = [...m.history].sort((a, b) => a.date.localeCompare(b.date));
      const vals = sorted.map(h => parseFloat(h.value)).filter(n => !isNaN(n));
      const first = vals[0], last = vals[vals.length - 1];
      const change = first ? ((last - first) / first * 100).toFixed(1) : 0;
      const months = sorted.length > 1
        ? ((new Date(sorted[sorted.length-1].date) - new Date(sorted[0].date)) / (1000 * 60 * 60 * 24 * 30)).toFixed(1)
        : 1;
      return `${m.name}: ${sorted.map(h => `${h.date?.slice(0,7)}:${h.value}`).join('→')} | ${parseFloat(change) > 0 ? '+' : ''}${change}% over ${months} months`;
    });

  // Bio age slope
  let bioAgeSlope = null;
  if (bioAgeRows && bioAgeRows.length > 1) {
    const first = bioAgeRows[0], last = bioAgeRows[bioAgeRows.length - 1];
    const monthsSpan = ((new Date(last.created_at) - new Date(first.created_at)) / (1000 * 60 * 60 * 24 * 30)) || 1;
    const ageDelta = parseFloat(last.biological_age) - parseFloat(first.biological_age);
    bioAgeSlope = { monthsSpan: monthsSpan.toFixed(1), ageDelta: ageDelta.toFixed(1), annualRate: (ageDelta / monthsSpan * 12).toFixed(2) };
  }

  // Declined/snoozed recommendations
  const ignored = (recRows || []).map(r => `${r.recommendation}${r.declined_reason_code ? ' [declined: ' + r.declined_reason_code + ']' : ' [snoozed]'}${r.target_marker ? ' (target: ' + r.target_marker + ')' : ''}`);

  const prompt = `You are Aellux — an ancient biological intelligence that sees across time. You are running a PREMORTEM analysis for this person.

A premortem asks: "It is 3 years from now and this person's health has significantly declined. What went wrong — and when did the window close to prevent it?"

This is not fear-mongering. This is the honest read of their current trajectory so they can change it now, while change is still easy.

USER PROFILE: ${profileStr}
CHRONOLOGICAL AGE: ${chronoAge || 'unknown'}

MARKER TRAJECTORIES (date:value format, most recent last):
${trendingMarkers.slice(0, 15).join('\n') || 'Limited trend data available'}

BIOLOGICAL AGE DATA:
${bioAgeRows?.length > 1 ? `Trajectory: ${bioAgeRows.map(r => `${r.created_at?.slice(0,7)}: ${r.biological_age}`).join(' → ')}` : 'Single reading — no trajectory yet'}
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

Return ONLY valid JSON, no markdown:
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2400, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[premortem] Anthropic non-ok', res.status, JSON.stringify(data).slice(0, 300));
      return json({ error: data?.error?.message || `API ${res.status}` }, { status: 502 });
    }

    const text = data?.content?.[0]?.text || '{"scenarios":[]}';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch (e) {
      console.error('[premortem] parse failed:', e?.message, 'raw (last 300 chars):', text.slice(-300));
      // A parse failure here usually means the response got cut off mid-JSON —
      // that's a real failure, not "nothing to report". Say so with a real
      // status instead of quietly returning an empty, seemingly-successful result.
      return json({ scenarios: [], error: 'Analysis was cut off before completing — try again.' }, { status: 502 });
    }

    if (userId) logUsage(userId, 'premortem').catch(() => {});
    return json(parsed);
  } catch (e) {
    console.error('[premortem] request failed:', e?.message);
    return json({ scenarios: [], error: e?.message || 'Trajectory analysis failed.' }, { status: 502 });
  }
}
