// ──────────────────────────────────────────────────────────────────────────────
// errors.ts — single wrapper around Sentry. Rest of the codebase imports
// from here, not from @sentry/react directly. Centralizes privacy guarantees
// and makes future swaps painless.
//
// Privacy invariants enforced here:
//   1. NEVER send biomarker values, document content, or synthesis output
//   2. NEVER send raw email, name, or other PII in user context
//   3. NEVER send reset tokens, auth tokens, or query string parameters
//   4. Session replay masks all text + inputs (health data is never visible)
//   5. No-op silently if VITE_SENTRY_DSN is unset
//
// Note: filename is `errors.ts` (not `sentry.ts`) so a future provider swap
// (Rollbar, Datadog, custom backend) doesn't require renaming imports.
// ──────────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE || 'production';

let initialized = false;

export function initErrorMonitoring() {
  if (initialized) return;
  if (!DSN) {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[errors] VITE_SENTRY_DSN not set — error monitoring disabled');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: DSN,
      environment: ENV,
      // Browser tracing — performance monitoring. 10% sample rate keeps quota
      // healthy on the free tier (5K events/mo). Real errors are always 100%.
      tracesSampleRate: 0.1,
      // Session Replay — record the 30s before any error so we can see what
      // the user did. Healthy sessions are NOT recorded (sample rate 0%).
      // Mask everything because we handle health data.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
      ],
      // Strip PII from error events before send
      beforeSend(event, hint) {
        return scrubEvent(event, hint);
      },
      // Ignore known noise that doesn't reflect real bugs
      ignoreErrors: [
        // Browser quirks
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        // Browser extensions injecting into pages
        'Non-Error promise rejection captured',
        // Network blips outside our control
        'Network request failed',
        'NetworkError when attempting to fetch resource',
        'Failed to fetch',
        // Safari/iOS quirks
        'AbortError',
        // PostHog issues — don't double-alert on analytics failures
        /posthog/i,
      ],
      // Don't capture errors from third-party scripts
      denyUrls: [
        /extensions\//,
        /^chrome:\/\//,
        /^chrome-extension:\/\//,
        /^moz-extension:\/\//,
      ],
    });
    initialized = true;
  } catch (err) {
    // Never let error monitoring crash the app
    // eslint-disable-next-line no-console
    console.error('[errors] init failed:', err);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Manually capture an exception. Use this in try/catch blocks where we
 * recover from the error but want to log it for investigation.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    const safeContext = scrubContext(context);
    Sentry.captureException(error, safeContext ? { extra: safeContext } : undefined);
  } catch {
    // never block
  }
}

/**
 * Tie subsequent errors to a logged-in user. Pass ONLY opaque user ID + plan.
 * Never pass email, name, or health data.
 */
export function identifyErrorUser(userId: string, properties?: { plan?: 'free' | 'pro' }) {
  if (!initialized || !userId) return;
  try {
    Sentry.setUser({
      id: userId,
      ...(properties?.plan ? { segment: properties.plan } : {}),
    });
  } catch {
    // ignore
  }
}

/**
 * Clear user context on logout so a shared device doesn't attribute errors
 * to the previous user.
 */
export function resetErrorUser() {
  if (!initialized) return;
  try {
    Sentry.setUser(null);
  } catch {
    // ignore
  }
}

/**
 * React error boundary component. Wrap risky subtrees with this so a
 * component crash doesn't take down the whole app.
 *
 * Usage:
 *   <ErrorBoundary fallback={<div>Something broke. Refresh?</div>}>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

// ── Privacy scrubbers ───────────────────────────────────────────────────────

/**
 * Strip PII and sensitive query string parameters from error events before
 * they're sent to Sentry. Belt-and-suspenders against accidental leakage.
 */
function scrubEvent(event: Sentry.ErrorEvent, _hint: Sentry.EventHint): Sentry.ErrorEvent | null {
  // Strip URL query strings that may contain reset tokens, emails, etc.
  if (event.request?.url) {
    try {
      const url = new URL(event.request.url);
      // Allowlist of query params that are safe to keep
      const SAFE_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'panel']);
      const params = Array.from(url.searchParams.keys());
      for (const k of params) {
        if (!SAFE_PARAMS.has(k)) url.searchParams.delete(k);
      }
      event.request.url = url.toString();
    } catch {
      // If URL parse fails, just strip query string entirely
      event.request.url = event.request.url.split('?')[0];
    }
  }
  // Sentry's default user context may include IP — already filtered by our
  // identifyErrorUser() which only passes opaque IDs, but defensive scrub
  // just in case
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }
  // Strip any breadcrumbs that look like they captured a fetch with sensitive data
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => {
      if (b.data && typeof b.data === 'object') {
        // Sentry auto-captures fetch breadcrumbs — strip request bodies that
        // could contain biomarker payloads or auth credentials
        const cleaned: Record<string, unknown> = { ...b.data };
        delete cleaned.body;
        delete cleaned.requestBody;
        delete cleaned.response_body_size; // not sensitive but useless noise
        return { ...b, data: cleaned };
      }
      return b;
    });
  }
  return event;
}

function scrubContext(ctx?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!ctx) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    // Strip email-shaped strings
    if (typeof v === 'string' && /@/.test(v) && /\.[a-z]{2,}/i.test(v)) continue;
    // Strip very long strings (likely free-form content / health data)
    if (typeof v === 'string' && v.length > 500) continue;
    // Strip arrays of objects (likely biomarker arrays)
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') continue;
    out[k] = v;
  }
  return out;
}
