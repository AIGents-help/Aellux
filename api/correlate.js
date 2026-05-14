/**
 * /api/correlate
 * Given two marker names and a userId, returns their aligned timeline
 * and an AI analysis of how they interact across the user's history.
 */
import { sbSelect, logUsage, rateLimit, json, getIntelligenceContext, formatIntelligenceForPrompt } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, plan, markerA, markerB, historyA, historyB, profileCtx, units } = body || {};
  if (!markerA || !markerB || !historyA?.length) return json({ error: 'Missing required fields' }, { status: 400 });

  if (userId) {
    const r = await rateLimit({ userId, endpoint: 'correlate', limit: plan === 'pro' ? 30 : 3, windowHours: 24 });
    if (!r.ok) return json({ error: 'Daily correlation limit reached.' }, { status: 429 });
  }

  const intelligence = await getIntelligenceContext(userId).catch(() => null);
  const intelligenceStr = formatIntelligenceForPrompt(intelligence);

  // Align timelines by month
  const toMonth = (d) => d?.slice(0, 7) || '';
  const alignedMonths = [...new Set([
    ...historyA.map(h => toMonth(h.date)),
    ...(historyB || []).map(h => toMonth(h.date)),
  ])].sort();

  const getVal = (history, month) => history.find(h => toMonth(h.date) === month)?.value ?? null;

  const timeline = alignedMonths.map(month => ({
    month,
    a: getVal(historyA, month),
    b: historyB?.length ? getVal(historyB, month) : null,
  })).filter(r => r.a !== null);

  const timelineStr = timeline.map(r =>
    `${r.month}: ${markerA}=${r.a}${units?.a ? units.a : ''} | ${markerB}=${r.b !== null ? r.b + (units?.b || '') : 'no data'}`
  ).join('\n');

  const prompt = `You are Aellux — an ancient health intelligence. Analyze the relationship between two biomarkers across this person's biological timeline.

MARKERS: ${markerA} vs ${markerB}
USER PROFILE: ${profileCtx || 'Not provided'}

ALIGNED TIMELINE (chronological):
${timelineStr}

Your analysis must:
1. State whether these markers are positively correlated, negatively correlated, or uncorrelated — with confidence.
2. Explain the biological MECHANISM linking them (if one exists). Be specific about the pathway.
3. Identify the most significant moment in the timeline where one shifted and caused the other to respond — name the month and the magnitude.
4. Give one concrete action that would move BOTH markers in the right direction simultaneously.

Plain prose only. No markdown, no bullet points, no asterisks. 4 sentences maximum. Direct, specific, biological.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message || `API ${res.status}` }, { status: 502 });
    const analysis = data?.content?.[0]?.text || 'No analysis returned.';
    if (userId) logUsage(userId, 'correlate').catch(() => {});
    return json({ analysis, timeline });
  } catch (e) {
    return json({ error: 'Correlation analysis unavailable.' }, { status: 502 });
  }
}
