// Aellux Sphere — thread list + message history (non-streaming CRUD).
// The actual chat turn (POST a message, get a streamed reply) lives in
// /api/sphere-chat.js. This endpoint just lets the frontend render a
// sidebar of past conversations and reopen one.
import { sbSelect, sbUpdate, sbDelete, json } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    const threadId = url.searchParams.get('threadId');
    if (!userId) return json({ error: 'userId required' }, { status: 400 });

    // Load one thread's messages
    if (threadId) {
      const messages = await sbSelect('sphere_messages', `thread_id=eq.${threadId}&user_id=eq.${userId}&order=created_at.asc&select=id,role,content,created_at`);
      return json({ messages: messages || [] });
    }

    // List threads (most recent first), excluding archived
    const threads = await sbSelect('sphere_threads', `user_id=eq.${userId}&archived=eq.false&order=updated_at.desc&limit=50&select=id,title,created_at,updated_at`);
    return json({ threads: threads || [] });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { userId, threadId, title } = body || {};
    if (!userId || !threadId || !title?.trim()) return json({ error: 'Missing fields' }, { status: 400 });
    const ok = await sbUpdate('sphere_threads', `id=eq.${threadId}&user_id=eq.${userId}`, { title: title.trim().slice(0, 80) });
    return json({ ok });
  }

  if (req.method === 'DELETE') {
    const userId = url.searchParams.get('userId');
    const threadId = url.searchParams.get('threadId');
    if (!userId || !threadId) return json({ error: 'Missing fields' }, { status: 400 });
    const ok = await sbUpdate('sphere_threads', `id=eq.${threadId}&user_id=eq.${userId}`, { archived: true });
    return json({ ok });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
}
