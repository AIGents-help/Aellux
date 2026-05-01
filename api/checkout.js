export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const PRICE_ID = process.env.STRIPE_PRICE_ID; // Aellux Pro monthly price
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aellux.health';

  if (!STRIPE_SECRET) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  try {
    const { email } = await req.json();

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': PRICE_ID,
        'line_items[0][quantity]': '1',
        customer_email: email || '',
        success_url: `${APP_URL}?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
        cancel_url: `${APP_URL}?cancelled=true`,
        'metadata[app]': 'aellux',
        'subscription_data[metadata][app]': 'aellux',
        allow_promotion_codes: 'true',
      }).toString(),
    });

    const session = await res.json();
    if (session.error) return new Response(JSON.stringify({ error: session.error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ url: session.url, id: session.id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
