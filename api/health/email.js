import { json, sendAlert } from '../_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const start = Date.now();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@aellux.health';

  if (!apiKey) {
    await sendAlert({ service: 'Email (Resend)', status: 'down', error: 'RESEND_API_KEY not set' });
    return json({ status: 'down', error: 'No Resend API key configured' }, { status: 500 });
  }

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
      const errMsg = `Resend ${response.status}: ${err.slice(0, 200)}`;
      // Common Resend failure modes worth flagging:
      //   401 = bad key, 403 = domain not verified (the May 10 outage),
      //   422 = invalid recipient, 429 = rate limit
      const isDomainIssue = /domain|verif|dns|mx|dkim/i.test(err);
      const context = isDomainIssue
        ? '⚠️ Likely DOMAIN VERIFICATION issue — check Resend dashboard + Namecheap DNS (recall the May 10 hostname-doubling bug)'
        : response.status === 401
          ? '⚠️ Auth failure — RESEND_API_KEY may be invalid or rotated'
          : null;
      await sendAlert({ service: 'Email (Resend)', status: 'down', error: errMsg, latency_ms, context });
      return json({ status: 'down', error: errMsg, latency_ms }, { status: 503 });
    }

    if (latency_ms > 5000) {
      await sendAlert({ service: 'Email (Resend)', status: 'degraded', latency_ms, context: 'Latency exceeds 5s' });
    }

    return json({ status: 'ok', latency_ms, from });
  } catch (err) {
    const latency_ms = Date.now() - start;
    await sendAlert({ service: 'Email (Resend)', status: 'down', error: err.message || 'unknown', latency_ms });
    return json({ status: 'down', error: err.message || 'unknown', latency_ms }, { status: 503 });
  }
}
