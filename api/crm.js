export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_CRM_DB_ID;

  try {
    const { email, plan, event, source } = await req.json();

    // 1. Log to Notion CRM
    if (token && dbId) {
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
            Email:  { title: [{ text: { content: email } }] },
            Plan:   { select: { name: plan || 'free' } },
            Event:  { rich_text: [{ text: { content: event || 'signup' } }] },
            Source: { rich_text: [{ text: { content: source || 'aellux.health' } }] },
            Date:   { date: { start: new Date().toISOString() } },
          },
        }),
      });
    }

    // 2. Upsert user in Supabase
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (sbUrl && sbKey) {
      await fetch(`${sbUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          email,
          plan: plan || 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
