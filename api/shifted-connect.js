import { json, hmacSign, sbSelect } from './_lib.js';

export const config = { runtime: 'edge' };

// Aellux user clicks "Connect SHIFTED" -> we mint a short-lived signed state
// -> hand back a redirect URL to SHIFTED's own consent screen. SHIFTED shows
// the user what's being requested (schedule, readiness, wearable summary),
// and on approval calls back to /api/shifted-callback server-to-server.
const SHIFTED_CONSENT_URL = process.env.SHIFTED_CONSENT_URL || 'https://companion.shifted.systems/connect/aellux';
const CALLBACK_URL = process.env.AELLUX_SHIFTED_CALLBACK_URL || 'https://www.aellux.health/api/shifted-callback';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete the consent flow

export default async function handler(req) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return json({ error: 'Missing userId' }, { status: 400 });

  const existing = await sbSelect('shifted_connections', `user_id=eq.${userId}&status=eq.connected&select=id&limit=1`);
  if (existing && existing.length > 0) {
    return json({ alreadyConnected: true });
  }

  const expiresAt = Date.now() + STATE_TTL_MS;
  const statePayload = `${userId}.${expiresAt}`;
  const signature = await hmacSign(statePayload);
  const state = `${statePayload}.${signature}`;

  const redirectUrl = `${SHIFTED_CONSENT_URL}?state=${encodeURIComponent(state)}&callback=${encodeURIComponent(CALLBACK_URL)}&scopes=schedule,readiness,wearable_summary`;

  return json({ redirectUrl });
}
