/**
 * /api/pattern-detect
 * Analyzes a user's full marker history for seasonal, circadian,
 * and cross-marker patterns. Called once after new labs uploaded.
 */
import { logUsage, rateLimit, json } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, plan, allMarkers, profileCtx, supplements } = body || {};
  if (!allMarkers?.length) return json({ error: 'No markers provided' }, { status: 400 });

  if (userId) {
    const r = await rateLimit({ userId, endpoint: 'pattern-detect', limit: plan === 'pro' ? 10 : 2, windowHours: 24 * 7 });
    if (!r.ok) return json({ patterns: [], rateLimited: true });
  }

  // Build timeline string for markers with history
  const markersWithHistory = allMarkers
    .filter(m => m.history && m.history.length > 2)
    .map(m => ({
      name: m.name,
      unit: m.unit || '',
      readings: [...m.history]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(h => `${h.date.slice(0, 7)}:${h.value}`)
        .join(' → '),
    }));

  if (!markersWithHistory.length) return json({ patterns: [] });

  const markerStr = markersWithHistory
    .slice(0, 15)
    .map(m => `${m.name} (${m.unit}): ${m.readings}`)
    .join('\n');

  const supplementStr = supplements?.length
    ? `\nSUPPLEMENTS/MEDICATIONS LOGGED:\n${supplements.map(s => `${s.name} ${s.dose || ''} started ${s.started_date || 'unknown'}`).join(', ')}`
    : '';

  const prompt = `You are Aellux — an ancient intelligence that reads biological patterns across time. Analyze this person's complete marker history and identify meaningful patterns.

USER PROFILE: ${profileCtx || 'Not provided'}

MARKER TIMELINES (date:value format):
${markerStr}${supplementStr}

Identify up to 4 of the most clinically significant patterns. Look for:
- SEASONAL: markers that consistently shift in specific months/seasons
- CORRELATED: two markers that move together or inversely (name both and the mechanism)
- TRIGGERED: a marker that shifted significantly after a visible event in another marker
- SUPPLEMENT: any visible correlation between supplement start date and a marker change

Return ONLY valid JSON, no markdown, no commentary:
{
  "patterns": [
    {
      "type": "seasonal|correlated|triggered|supplement",
      "title": "Short descriptive title (e.g. 'Winter Testosterone Dip')",
      "markers": ["marker1", "marker2"],
      "finding": "2-3 sentences: what you found, the mechanism, and what it means for this person. Plain prose, no markdown.",
      "action": "One specific thing they can do about this pattern."
    }
  ]
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (!res.ok) return json({ patterns: [], error: data?.error?.message }, { status: 502 });
    const text = data?.content?.[0]?.text || '{}';
    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch { parsed = { patterns: [] }; }
    if (userId) logUsage(userId, 'pattern-detect').catch(() => {});
    return json(parsed);
  } catch {
    return json({ patterns: [] }, { status: 502 });
  }
}
