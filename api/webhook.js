// Stripe webhook — handles subscription lifecycle + writes to Supabase + logs to Notion
export const config = { runtime: 'edge' };

async function updateSupabaseUser(email, plan, customerId, subscriptionId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  await fetch(`${url}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      plan,
      customer_id: customerId || null,
      subscription_id: subscriptionId || null,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function logToNotion(event, email, plan) {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_CRM_DB_ID;
  if (!token || !dbId) return;

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
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  // Verify webhook signature
  if (WEBHOOK_SECRET && sig) {
    // Edge runtime — verify manually
    try {
      const parts = sig.split(',').reduce((acc, part) => {
        const [key, val] = part.split('=');
        acc[key] = val;
        return acc;
      }, {});
      const timestamp = parts.t;
      const payload = `${timestamp}.${body}`;
      const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sig2 = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
      const computed = Array.from(new Uint8Array(sig2)).map(b => b.toString(16).padStart(2, '0')).join('');
      if (computed !== parts.v1) {
        return new Response('Invalid signature', { status: 400 });
      }
    } catch {
      return new Response('Signature verification failed', { status: 400 });
    }
  }

  const event = JSON.parse(body);
  const obj = event.data?.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // New subscription — get email and upgrade user
        const sessionId = obj.id;
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
        // Subscription cancelled/expired
        const customerId = obj.customer;
        // Look up email from Stripe
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
        // Payment failure — notify but don't downgrade immediately
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
    console.error('Webhook error:', err);
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
}
