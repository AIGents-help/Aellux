export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

  try {
    const { sessionId, email } = await req.json();

    if (sessionId) {
      // Verify checkout session
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
      });
      const session = await res.json();
      const active = session.payment_status === 'paid' || session.status === 'complete';
      return new Response(JSON.stringify({
        active,
        customerId: session.customer,
        email: session.customer_email || session.customer_details?.email,
        subscriptionId: session.subscription,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (email) {
      // Look up by email
      const cusRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'&limit=1`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
      });
      const cusData = await cusRes.json();
      const customer = cusData.data?.[0];
      if (!customer) return new Response(JSON.stringify({ active: false }), { headers: { 'Content-Type': 'application/json' } });

      // Check active subscriptions
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=1`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
      });
      const subData = await subRes.json();
      const active = (subData.data?.length || 0) > 0;
      return new Response(JSON.stringify({
        active,
        customerId: customer.id,
        email: customer.email,
        subscriptionId: subData.data?.[0]?.id,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ active: false }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, active: false }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
