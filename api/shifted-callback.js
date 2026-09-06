import { json, hmacVerify, sbUpsert, sendAlert } from './_lib.js';

export const config = { runtime: 'edge' };

// SHIFTED calls this server-to-server after the user approves the consent
// screen shown at SHIFTED_CONSENT_URL. Body carries back the state we minted
// in shifted-connect.js (proves this callback answers a request we actually
// made) plus a fresh grant signed with the same shared secret (proves
// SHIFTED, not anyone reading the state, is the one calling us).
const GRANT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — re-consent after this

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { state, shifted_user_id, scopes, grant_signature } = body || {};
  if (!state || !shifted_user_id || !grant_signature) {
    return json({ error: 'Missing state, shifted_user_id, or grant_signature' }, { status: 400 });
  }

  // Verify the state we minted hasn't been tampered with or expired.
  const parts = state.split('.');
  if (parts.length !== 3) return json({ error: 'Malformed state' }, { status: 400 });
  const [aelluxUserId, expiresAtStr, stateSignature] = parts;
  const statePayload = `${aelluxUserId}.${expiresAtStr}`;
  const stateOk = await hmacVerify(statePayload, stateSignature);
  if (!stateOk) return json({ error: 'Invalid state signature' }, { status: 401 });
  if (Date.now() > parseInt(expiresAtStr, 10)) return json({ error: 'State expired, restart the connection' }, { status: 401 });

  // Verify SHIFTED actually signed this grant (not a replay from the state alone).
  const grantOk = await hmacVerify(`${shifted_user_id}.${aelluxUserId}`, grant_signature);
  if (!grantOk) return json({ error: 'Invalid grant signature' }, { status: 401 });

  const result = await sbUpsert('shifted_connections', {
    user_id: aelluxUserId,
    shifted_user_id,
    status: 'connected',
    scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : ['schedule', 'readiness', 'wearable_summary'],
    grant_token_encrypted: grant_signature,
    grant_expires_at: new Date(Date.now() + GRANT_TTL_MS).toISOString(),
    updated_at: new Date().toISOString(),
  }, 'user_id');

  if (!result) {
    await sendAlert({ service: 'shifted-callback', status: 'error', error: 'shifted_connections upsert failed', context: { aelluxUserId } });
    return json({ error: 'Could not save connection' }, { status: 500 });
  }

  return json({ ok: true, connected: true });
}
