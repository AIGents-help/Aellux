import { json } from '../_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const start = Date.now();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@aellux.health';
  if (!apiKey) return json({ status: 'down', error: 'No Resend API key configured' }, { status: 500 });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: ['healthcheck@aigents.help'],
        subject: 'Aellux email healthcheck',
        text: `Healthcheck ping at ${new Date().toISOString()}. If you receive this, the Aellux Resend pipeline is operational.`,
      }),
    });

    const latency_ms = Date.now() - start;

    if (!response.ok) {
      const err = await response.text();
      return json({ status: 'down', error: `Resend ${response.status}: ${err.slice(0, 200)}`, latency_ms }, { status: 503 });
    }

    return json({ status: 'ok', latency_ms, from });
  } catch (err) {
    return json({ status: 'down', error: err.message || 'unknown', latency_ms: Date.now() - start }, { status: 503 });
  }
}
