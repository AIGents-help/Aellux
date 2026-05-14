/**
 * /api/protocol-outcome
 * Compares biomarkers before and after a protocol cycle.
 * Called when user uploads new labs after completing a cycle.
 */
import { sbSelect, logUsage, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, plan, protocolId, cycleStartDate, currentMarkers, previousMarkers, protocolSummary, profileCtx } = body || {};
  if (!userId || !currentMarkers?.length) return json({ error: 'Missing required fields' }, { status: 400 });

  // Compute deltas
  const changes = currentMarkers.map(curr => {
    const prev = previousMarkers?.find(p => p.name === curr.name);
    if (!prev) return { name: curr.name, current: curr.value, previous: null, delta: null, pct: null };
    const d = parseFloat(curr.value) - parseFloat(prev.value);
    const pct = parseFloat(prev.value) ? (d / parseFloat(prev.value) * 100).toFixed(1) : null;
    return { name: curr.name, unit: curr.unit || '', current: curr.value, previous: prev.value, delta: d.toFixed(2), pct };
  }).filter(c => c.delta !== null);

  const significantChanges = changes.filter(c => Math.abs(parseFloat(c.pct || '0')) > 10);
  const improvements = changes.filter(c => parseFloat(c.delta) < 0 && ['CRP', 'Estrogen', 'LDL', 'ApoB', 'HbA1c', 'Fasting Glucose', 'Triglycerides', 'Cortisol'].includes(c.name) ||
    parseFloat(c.delta) > 0 && ['Total Testosterone', 'Free Testosterone', 'HDL', 'Vitamin D', 'Ferritin', 'DHEA-S', 'IGF-1'].includes(c.name));
  const regressions = changes.filter(c => !improvements.find(i => i.name === c.name) && Math.abs(parseFloat(c.pct || '0')) > 10);

  const changeStr = significantChanges.map(c =>
    `${c.name}: ${c.previous}→${c.current}${c.unit} (${parseFloat(c.delta) > 0 ? '+' : ''}${c.delta}, ${c.pct}%)`
  ).join(' | ');

  const prompt = `You are Aellux. A person just completed a protocol cycle and uploaded new labs. Compare what changed.

USER PROFILE: ${profileCtx || 'Not provided'}
PROTOCOL RUN: Started ${cycleStartDate || 'unknown date'}
PROTOCOL SUMMARY: ${protocolSummary || 'Standard Biologic Protocol'}

SIGNIFICANT MARKER CHANGES (>10% shift):
${changeStr || 'No significant changes detected — labs may have been uploaded too soon after protocol start.'}

IMPROVEMENTS (${improvements.length}): ${improvements.map(c => `${c.name} ${c.pct}%`).join(', ') || 'none'}
REGRESSIONS (${regressions.length}): ${regressions.map(c => `${c.name} ${c.pct}%`).join(', ') || 'none'}

Write a direct protocol audit — what worked, what didn't, and what to adjust for the next cycle. Reference specific numbers. If a recommended intervention is visible in the data (e.g. ferritin dropping after blood donation was recommended), acknowledge it. If something got worse, name what the protocol should have done differently. End with the single highest-leverage adjustment for the next cycle. Plain prose, no markdown, 5 sentences max.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 350, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: `API ${res.status}` }, { status: 502 });
    const assessment = data?.content?.[0]?.text || '';

    // Store outcome
    try {
      await fetch(`${SB}/rest/v1/protocol_outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: userId, protocol_id: protocolId || null,
          cycle_start_date: cycleStartDate || null,
          markers_before: previousMarkers, markers_after: currentMarkers,
          changes, ai_assessment: assessment,
        }),
      });
    } catch {}

    if (userId) logUsage(userId, 'protocol-outcome').catch(() => {});
    return json({ assessment, improvements, regressions, changes });
  } catch {
    return json({ error: 'Protocol outcome analysis unavailable.' }, { status: 502 });
  }
}
