import { json, sendAlert } from '../_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const start = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    await sendAlert({ service: 'AI (Anthropic)', status: 'down', error: 'ANTHROPIC_API_KEY not set' });
    return json({ status: 'down', error: 'No API key configured' }, { status: 500 });
  }

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
      // Distinguish the most-common failure modes in the alert.
      // The May 12 2026 outage was specifically out-of-credits — that one matters most.
      const errMsg = `Anthropic ${response.status}: ${err.slice(0, 200)}`;
      const isCreditIssue = /credit|balance|insufficient/i.test(err);
      const context = isCreditIssue
        ? '⚠️ Likely OUT OF CREDITS — check https://console.anthropic.com/settings/billing'
        : response.status === 401
          ? '⚠️ Auth failure — ANTHROPIC_API_KEY may be invalid or rotated'
          : null;
      await sendAlert({ service: 'AI (Anthropic)', status: 'down', error: errMsg, latency_ms, context });
      return json({ status: 'down', error: errMsg, latency_ms }, { status: 503 });
    }

    // Degraded if latency is wild (>5s for a 1-token call means something is wrong)
    if (latency_ms > 5000) {
      await sendAlert({ service: 'AI (Anthropic)', status: 'degraded', latency_ms, context: 'Latency exceeds 5s on a 1-token call' });
    }

    return json({ status: 'ok', latency_ms, model: 'claude-haiku-4-5-20251001' });
  } catch (err) {
    const latency_ms = Date.now() - start;
    await sendAlert({ service: 'AI (Anthropic)', status: 'down', error: err.message || 'unknown', latency_ms });
    return json({ status: 'down', error: err.message || 'unknown', latency_ms }, { status: 503 });
  }
}
