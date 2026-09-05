import { json, sendAlert } from '../_lib.js';

export const config = { runtime: 'edge' };

// Every distinct model string actually referenced anywhere in api/*.js.
// Keep this in sync manually when a new model is introduced — there's no
// safe way to auto-discover it from inside an edge function. The point of
// this list existing at all is that a single hardcoded health check missed
// a dead model reference for an unknown period until it was found by hand;
// this makes "test the one model we happen to remember" impossible.
const MODELS_IN_USE = ['claude-haiku-4-5-20251001', 'claude-sonnet-5'];

async function pingModel(model) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const start = Date.now();
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }),
    });
    const latency_ms = Date.now() - start;
    if (!response.ok) {
      const err = await response.text();
      return { model, ok: false, status: response.status, error: err.slice(0, 300), latency_ms };
    }
    return { model, ok: true, latency_ms };
  } catch (err) {
    return { model, ok: false, error: err.message || 'unknown', latency_ms: Date.now() - start };
  }
}

export default async function handler(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await sendAlert({ service: 'AI (Anthropic)', status: 'down', error: 'ANTHROPIC_API_KEY not set' });
    return json({ status: 'down', error: 'No API key configured' }, { status: 500 });
  }

  const results = await Promise.all(MODELS_IN_USE.map(pingModel));
  const failures = results.filter(r => !r.ok);

  for (const f of failures) {
    const isCreditIssue = /credit|balance|insufficient/i.test(f.error || '');
    const isNotFound = f.status === 404 || /not_found_error/i.test(f.error || '');
    const context = isCreditIssue
      ? '⚠️ Likely OUT OF CREDITS — check https://console.anthropic.com/settings/billing'
      : f.status === 401
        ? '⚠️ Auth failure — ANTHROPIC_API_KEY may be invalid or rotated'
        : isNotFound
          ? `⚠️ Model "${f.model}" no longer exists — it was likely retired. Update every api/*.js reference to a current model ID.`
          : null;
    await sendAlert({
      service: `AI (Anthropic — ${f.model})`,
      status: 'down',
      error: f.status ? `${f.status}: ${f.error}` : f.error,
      latency_ms: f.latency_ms,
      context,
    });
  }

  const slowest = Math.max(...results.filter(r => r.ok).map(r => r.latency_ms), 0);
  if (slowest > 5000) {
    await sendAlert({ service: 'AI (Anthropic)', status: 'degraded', latency_ms: slowest, context: 'Latency exceeds 5s on a 1-token call' });
  }

  if (failures.length > 0) {
    return json({ status: 'down', results }, { status: 503 });
  }
  return json({ status: 'ok', results });
}
