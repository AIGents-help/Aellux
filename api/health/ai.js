import { json } from '../_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const start = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ status: 'down', error: 'No API key configured' }, { status: 500 });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ok' }],
      }),
    });

    const latency_ms = Date.now() - start;

    if (!response.ok) {
      const err = await response.text();
      return json({ status: 'down', error: `Anthropic ${response.status}: ${err.slice(0, 200)}`, latency_ms }, { status: 503 });
    }

    return json({ status: 'ok', latency_ms, model: 'claude-haiku-4-5-20251001' });
  } catch (err) {
    return json({ status: 'down', error: err.message || 'unknown', latency_ms: Date.now() - start }, { status: 503 });
  }
}
