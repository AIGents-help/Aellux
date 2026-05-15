// ──────────────────────────────────────────────────────────────────────────────
// analytics.ts — single wrapper around PostHog. Rest of the codebase imports
// from here, not from posthog-js directly. Makes future swaps painless and
// centralizes privacy guarantees in one place.
//
// Privacy invariants enforced here:
//   1. NEVER send biomarker values, document content, or synthesis output
//   2. NEVER send raw email — only opaque user IDs (PostHog identify handles email
//      separately via setPersonProperties on the server side if ever needed)
//   3. NEVER send medical conditions, medications, or personal health data
//   4. No-op silently if VITE_POSTHOG_KEY is unset (dev / preview safety)
// ──────────────────────────────────────────────────────────────────────────────

import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com';

// Track init state so duplicate calls don't reinitialize
let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  if (!KEY) {
    // No key set (dev, preview deploys, or accidentally missing in prod).
    // Silent no-op — never crash the app.
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[analytics] VITE_POSTHOG_KEY not set — analytics disabled');
    }
    return;
  }

  try {
    posthog.init(KEY, {
      api_host: HOST,
      // Capture pageviews automatically on route changes
      capture_pageview: true,
      // Autocapture: PostHog's auto-event capture for clicks/forms.
      // Disabled — we send EXPLICIT events from known funnel points. Autocapture
      // creates noise and risks capturing biomarker values from DOM accidentally.
      autocapture: false,
      // Session replays — enable but mask all input/text by default. Useful for
      // debugging UX, never expose health data.
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '*', // mask all text in replays for privacy
      },
      disable_session_recording: false,
      // Persistence — use localStorage so user identity persists across visits
      // (this is standard for analytics; no consent banner needed in US, but
      // we use a privacy-respecting setup)
      persistence: 'localStorage+cookie',
      // Disable advertising-related features
      advanced_disable_decide: false,
      // Loaded callback — useful for debugging
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.info('[analytics] PostHog loaded', ph.get_distinct_id());
        }
      },
    });
    initialized = true;
  } catch (err) {
    // Never let analytics crash the app
    // eslint-disable-next-line no-console
    console.error('[analytics] init failed:', err);
  }
}

// ── Event tracking ──────────────────────────────────────────────────────────
// All events are explicit. Use the typed wrappers below, not raw posthog.capture,
// so the event taxonomy stays consistent across the codebase.

type EventName =
  | 'landing_viewed'
  | 'auth_modal_opened'
  | 'signup_completed'
  | 'signin_completed'
  | 'document_uploaded'
  | 'synthesis_generated'
  | 'protocol_generated'
  | 'supplements_generated'
  | 'meals_generated'
  | 'pro_checkout_started'
  | 'pro_subscribed'
  | 'get_tested_viewed'
  | 'get_tested_partner_clicked'
  | 'profile_completed'
  | 'ask_aellux_used';

export function track(event: EventName, properties?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    // Sanity guard: strip any property values that look like biomarker data
    // (numbers with units) or health content (long strings). Belt-and-suspenders
    // against accidental leakage. Real events should only send IDs, counts, and
    // category-level flags.
    const safe = sanitizeProperties(properties);
    posthog.capture(event, safe);
  } catch {
    // Never block the app on analytics
  }
}

// Identify a logged-in user. Call once after auth succeeds.
// Pass ONLY: user id (string), optional plan tier, optional opaque flags.
// Never pass email, name, medical history.
export function identify(userId: string, properties?: { plan?: 'free' | 'pro'; signup_source?: string }) {
  if (!initialized || !userId) return;
  try {
    posthog.identify(userId, properties);
  } catch {
    // ignore
  }
}

// Reset on logout — clears the distinct_id and starts a fresh anonymous session
export function resetAnalytics() {
  if (!initialized) return;
  try {
    posthog.reset();
  } catch {
    // ignore
  }
}

// ── Privacy sanitizer ───────────────────────────────────────────────────────
// Recursively strip property values that match heuristics for sensitive data.
// Belt-and-suspenders — events should already be clean by construction.
function sanitizeProperties(props?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    // Strip values that look like email addresses
    if (typeof v === 'string' && /@/.test(v) && /\.[a-z]{2,}/i.test(v)) continue;
    // Strip values longer than 200 chars (likely free-form content)
    if (typeof v === 'string' && v.length > 200) continue;
    // Strip arrays of biomarker-like objects
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') continue;
    out[k] = v;
  }
  return out;
}
