import { json, logUsage } from './_lib.js';

export const config = { runtime: 'edge' };

/**
 * Logs affiliate clicks into usage_log so Aellux has an honest source of truth
 * about referral traffic, independent of partner attribution dashboards.
 *
 * POST { userId, endpoint }
 *   endpoint examples: 'affiliate-click-function', 'affiliate-click-quest'
 *
 * Returns { ok: true } — fire-and-forget, never blocks the user's navigation.
 */
export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'POST only' }, { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ ok: true }); }

  const { userId, endpoint } = body || {};

  // Strict allowlist: only affiliate-click-* events go through this endpoint.
  // Prevents abuse where someone fires arbitrary endpoint strings into usage_log.
  if (!userId || typeof endpoint !== 'string' || !endpoint.startsWith('affiliate-click-')) {
    return json({ ok: true });
  }

  // Truncate to defend against absurdly long strings making it into the DB
  const safeEndpoint = endpoint.slice(0, 64);

  // Fire and forget — never block the response
  logUsage(userId, safeEndpoint).catch(() => {});

  return json({ ok: true });
}
