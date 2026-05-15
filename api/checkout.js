export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const PRICE_MONTHLY = process.env.STRIPE_PRICE_ID;           // $29/mo — existing
  const PRICE_ANNUAL  = process.env.STRIPE_PRICE_ANNUAL_ID;   // $249/yr — new
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aellux.health';

  if (!STRIPE_SECRET) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  try {
    const { email, plan = 'monthly', gift = false, giftEmail } = await req.json();

    const priceId = (plan === 'annual' && PRICE_ANNUAL) ? PRICE_ANNUAL : PRICE_MONTHLY;

    const params = {
      mode: gift ? 'payment' : 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      customer_email: gift ? (giftEmail || email || '') : (email || ''),
      success_url: gift
        ? `${APP_URL}?gift=true&session_id={CHECKOUT_SESSION_ID}`
        : `${APP_URL}?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
      cancel_url: `${APP_URL}?cancelled=true`,
      'metadata[app]': 'aellux',
      'metadata[plan]': plan,
      'metadata[gift]': gift ? 'true' : 'false',
      allow_promotion_codes: 'true',
    };

    if (!gift) {
      params['subscription_data[metadata][app]'] = 'aellux';
      params['subscription_data[metadata][plan]'] = plan;
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    const session = await res.json();
    if (session.error) return new Response(JSON.stringify({ error: session.error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ url: session.url, id: session.id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
