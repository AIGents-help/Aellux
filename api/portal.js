export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aellux.health';

  try {
    const { customerId } = await req.json();
    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: customerId, return_url: APP_URL }).toString(),
    });
    const portal = await res.json();
    return new Response(JSON.stringify({ url: portal.url }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
