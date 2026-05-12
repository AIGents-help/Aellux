import { rateLimit, logUsage, json } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key' }, { status: 500 });

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { systemPrompt, userMessage, maxTokens = 600, userId = null, plan = 'free' } = body || {};

  // Rate limit: free=5 / 24h, pro=500 / 30d
  if (userId) {
    const conf = plan === 'pro'
      ? { limit: 500, windowHours: 24 * 30 }
      : { limit: 5, windowHours: 24 };
    const r = await rateLimit({ userId, endpoint: 'claude', ...conf });
    if (!r.ok) {
      return json({
        error: plan === 'pro'
          ? `You've hit your monthly limit of ${conf.limit} Aellux conversations. Resets in 30d.`
          : `Free plan allows ${conf.limit} questions per day. Upgrade to Pro for 500/month.`,
        code: 'rate_limited',
      }, { status: 429 });
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  logUsage(userId, 'claude').catch(() => {});

  return json({ text });
}
