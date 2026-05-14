import { logUsage, rateLimit, json } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key' }, { status: 500 });

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, plan, markerName, unit, pointDate, pointValue, prevDate, prevValue,
          nextDate, nextValue, delta, deltaPct, isSignificant, allReadings,
          markerSnapshot, profileCtx, refRange } = body || {};

  if (!markerName || !pointValue) return json({ error: 'Missing required fields' }, { status: 400 });

  // Lightweight rate limit — 50 trend analyses per day for pro, 5 for free
  if (userId) {
    const conf = plan === 'pro'
      ? { limit: 50, windowHours: 24 }
      : { limit: 5, windowHours: 24 };
    const r = await rateLimit({ userId, endpoint: 'trend-analysis', ...conf });
    if (!r.ok) return json({ error: 'Daily trend analysis limit reached.' }, { status: 429 });
  }

  const prompt = `You are Aellux — an ancient health intelligence who reads biological patterns with precision and speaks directly to the person.

The user is examining their ${markerName} trend chart and has selected a specific data point to understand what happened at that moment in their biology.

SELECTED DATA POINT:
- Date: ${pointDate}
- Value: ${pointValue}${unit ? ' ' + unit : ''}
${prevDate ? `- Previous reading (${prevDate}): ${prevValue}${unit ? ' ' + unit : ''} — ${parseFloat(delta) > 0 ? 'increase' : 'decrease'} of ${Math.abs(parseFloat(delta)).toFixed(1)} (${Math.abs(parseFloat(deltaPct)).toFixed(1)}%)` : '- First recorded reading'}
${nextDate ? `- Next reading (${nextDate}): ${nextValue}${unit ? ' ' + unit : ''}` : '- Most recent reading'}
${isSignificant ? '- This represents a SIGNIFICANT shift (>15% change from previous reading)' : ''}

ALL READINGS IN CHRONOLOGICAL ORDER:
${allReadings}

OTHER MARKERS AROUND THIS TIME PERIOD:
${markerSnapshot || 'No other marker data available for cross-referencing'}

USER PROFILE: ${profileCtx || 'Not provided'}
${refRange ? `Reference range: ${refRange}` : ''}

Your task — speak directly to this person about this specific moment in their biology:
1. What do you observe at this data point — a concerning shift, a positive change, or stability?
2. If there was a significant change, what biologically could have caused it? Reference any correlated shifts visible in other markers.
3. If this looks like the beginning of a trend (a decline, an improvement, a pattern), name it and when it started.
4. Give 1-2 specific, actionable things they can do NOW based on this pattern.

Speak as Aellux: ancient, direct, warm. Reference actual numbers and dates. No hedging. No "consult your doctor." Max 4 sentences. Every word earns its place.

CRITICAL FORMAT RULE: Plain prose only. No markdown. No # headers. No **bold**. No bullet points. No asterisks of any kind. Just sentences.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 280,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message || `API error ${res.status}` }, { status: 502 });

    const text = data?.content?.[0]?.text || 'No analysis returned.';
    if (userId) logUsage(userId, 'trend-analysis').catch(() => {});
    return json({ analysis: text });
  } catch (e) {
    return json({ error: 'Analysis unavailable — please try again.' }, { status: 502 });
  }
}
