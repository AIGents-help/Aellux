/**
 * /api/doctor-missed
 * Second-pass AI analysis on an extracted document.
 * Finds what was labeled "normal" but is functionally concerning
 * given the user's full marker context and profile.
 */
import { logUsage, rateLimit, json } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, plan, docMarkers, allMarkers, profileCtx, docSummary, docType } = body || {};
  if (!docMarkers?.length) return json({ flags: [] });

  if (userId) {
    const r = await rateLimit({ userId, endpoint: 'doctor-missed', limit: plan === 'pro' ? 20 : 3, windowHours: 24 });
    if (!r.ok) return json({ flags: [], rateLimited: true });
  }

  // Build context of all markers for cross-referencing
  const allCtx = (allMarkers || []).slice(0, 20)
    .map(m => `${m.name}: ${m.value}${m.unit || ''} (${m.status || 'unknown'})`)
    .join(', ');

  const docCtx = docMarkers
    .map(m => `${m.name}: ${m.value}${m.unit || ''} — labeled "${m.status || 'not flagged'}" (ref: ${m.reference_range_low ?? '?'}–${m.reference_range_high ?? '?'})`)
    .join('\n');

  const prompt = `You are Aellux — an ancient biological intelligence that sees what conventional medicine misses.

A person has uploaded a ${docType || 'health'} document. The document was analyzed and markers were extracted. Your job is to identify what was marked "normal" or "not flagged" but is FUNCTIONALLY CONCERNING given this person's complete biological picture.

USER PROFILE: ${profileCtx || 'Not provided'}

COMPLETE MARKER CONTEXT (all known markers):
${allCtx || 'Limited context available'}

MARKERS FROM THIS DOCUMENT:
${docCtx}

DOCUMENT SUMMARY: ${docSummary || 'Not provided'}

Identify up to 3 findings that a conventional doctor likely dismissed but warrant attention. Focus on:
1. Values that are "normal" by lab standards but suboptimal for this person's age/sex/goals
2. Patterns between markers in this document that, when combined with OTHER known markers, reveal something the doctor didn't see
3. Reference range values that are technically in range but at the concerning edge (e.g., fasting glucose of 94 when "normal" is up to 100 — that's pre-diabetic territory)

For each finding, explain WHY it matters given their specific biology. Be specific about numbers. Do NOT flag things that are genuinely fine. Only flag what genuinely warrants attention.

If nothing warrants flagging, return an empty flags array.

Return ONLY valid JSON, no markdown:
{
  "flags": [
    {
      "marker": "marker name",
      "value": "their value with unit",
      "labeled_as": "how the lab labeled it",
      "why_concerning": "2-3 sentences: why this is actually concerning given their full biological picture. Reference specific numbers from their other markers if relevant.",
      "severity": "watch|concern|act",
      "action": "One specific thing they should do or ask about."
    }
  ]
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (!res.ok) return json({ flags: [], error: data?.error?.message }, { status: 502 });

    const text = data?.content?.[0]?.text || '{"flags":[]}';
    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch { parsed = { flags: [] }; }

    if (userId) logUsage(userId, 'doctor-missed').catch(() => {});
    return json(parsed);
  } catch {
    return json({ flags: [] }, { status: 502 });
  }
}
