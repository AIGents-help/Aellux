// Stripe webhook — handles subscription lifecycle + writes to Supabase + logs to Notion
//
// Security + reliability invariants:
//   1. Signature verification is REQUIRED when STRIPE_WEBHOOK_SECRET is set.
//      In production it must be set — we refuse unsigned requests with 401.
//      Without this, anyone could POST a forged checkout.session.completed
//      event to grant themselves Pro access.
//   2. Failed Supabase updates return 500 to Stripe, NOT 200. Stripe will
//      automatically retry with exponential backoff. Silently swallowing
//      errors causes paying users to remain on the free plan permanently.
//   3. Failed Notion logs are non-fatal (CRM is nice-to-have, not critical).

export const config = { runtime: 'edge' };

async function updateSupabaseUser(email, plan, customerId, subscriptionId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase config missing — cannot update user plan');
  }

  const res = await fetch(`${url}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      // return=representation tells PostgREST to return the updated rows so we
      // can confirm SOMETHING was actually updated (not a no-op)
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      plan,
      customer_id: customerId || null,
      subscription_id: subscriptionId || null,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Supabase update failed: ${res.status} ${txt.slice(0, 200)}`);
  }

  // PostgREST returns the updated rows. If empty, the WHERE clause matched
  // nothing — the user doesn't exist yet. This is a real failure mode (signup
  // → webhook race condition). Throwing causes Stripe to retry the webhook
  // with backoff, by which time the user row will exist.
  const updated = await res.json().catch(() => []);
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error(`Supabase update matched 0 rows for email=${email} (signup race?)`);
  }
}

async function logToNotion(event, email, plan) {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_CRM_DB_ID;
  if (!token || !dbId) return; // non-fatal — CRM is optional

  try {
    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          Email: { title: [{ text: { content: email } }] },
          Event: { rich_text: [{ text: { content: event } }] },
          Plan: { select: { name: plan } },
          Date: { date: { start: new Date().toISOString() } },
        },
      }),
    });
  } catch (err) {
    // Notion failures don't block the webhook — log but don't throw
    console.error('Notion log failed:', err?.message || err);
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  // SECURITY: signature verification is mandatory when configured.
  // If the env var is missing, refuse the request — never accept unsigned events
  // in a system that grants paid access based on the payload.
  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not set — refusing webhook to prevent forgery');
    return new Response('Webhook secret not configured', { status: 503 });
  }
  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 401 });
  }

  // Edge runtime — verify HMAC manually (no Node crypto)
  try {
    const parts = sig.split(',').reduce((acc, part) => {
      const [key, val] = part.split('=');
      acc[key] = val;
      return acc;
    }, {});
    const timestamp = parts.t;
    if (!timestamp || !parts.v1) {
      return new Response('Malformed signature', { status: 401 });
    }
    // Reject events older than 5 minutes (Stripe's recommended tolerance)
    const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (Number.isNaN(ageSeconds) || ageSeconds > 300) {
      return new Response('Signature timestamp out of tolerance', { status: 401 });
    }
    const payload = `${timestamp}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig2 = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const computed = Array.from(new Uint8Array(sig2)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (computed !== parts.v1) {
      return new Response('Invalid signature', { status: 401 });
    }
  } catch (err) {
    return new Response('Signature verification failed', { status: 401 });
  }

  const event = JSON.parse(body);
  const obj = event.data?.object;

  // RELIABILITY: errors inside the switch propagate to a 500 response, which
  // tells Stripe to retry the webhook. This is the safe behavior — better to
  // retry a successful update than to skip a failed one.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const email = obj.customer_email || obj.customer_details?.email;
        const customerId = obj.customer;
        const subscriptionId = obj.subscription;
        if (email) {
          await updateSupabaseUser(email, 'pro', customerId, subscriptionId);
          await logToNotion('subscription_started', email, 'pro');
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const customerId = obj.customer;
        const cusRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` }
        });
        const customer = await cusRes.json();
        if (customer.email) {
          await updateSupabaseUser(customer.email, 'free', customerId, null);
          await logToNotion('subscription_cancelled', customer.email, 'free');
        }
        break;
      }
      case 'invoice.payment_failed': {
        const customerId = obj.customer;
        const cusRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` }
        });
        const customer = await cusRes.json();
        if (customer.email) {
          await logToNotion('payment_failed', customer.email, 'pro');
        }
        break;
      }
      case 'customer.subscription.updated': {
        const customerId = obj.customer;
        const status = obj.status;
        const cusRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` }
        });
        const customer = await cusRes.json();
        if (customer.email) {
          const plan = status === 'active' ? 'pro' : 'free';
          await updateSupabaseUser(customer.email, plan, customerId, obj.id);
          await logToNotion(`subscription_${status}`, customer.email, plan);
        }
        break;
      }
    }
  } catch (err) {
    // Real failure — return 500 so Stripe retries. Log the event type + id
    // for debugging without exposing customer data.
    console.error(`Webhook handler failed: event=${event.type} id=${event.id} err=${err?.message || err}`);
    return new Response(JSON.stringify({
      received: false,
      error: 'Internal processing error — Stripe will retry',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
