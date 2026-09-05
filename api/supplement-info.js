export const config = { runtime: 'edge' };
import { json, rateLimit } from './_lib.js';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const { name, dose, userId, allMarkers, profile } = await req.json();
  if (!name) return json({ error: 'No supplement name provided' }, { status: 400 });

  const limited = await rateLimit(userId, 'supplement-info', 20);
  if (limited) return json({ error: 'rate_limited' }, { status: 429 });

  const markerCtx = allMarkers?.slice(0, 15).map(m => `${m.name}: ${m.value}${m.unit || ''} [${m.status || 'normal'}]`).join(', ') || '';
  const profileCtx = profile ? [
    profile.biological_sex && `sex: ${profile.biological_sex}`,
    profile.birth_year && `age: ${new Date().getFullYear() - profile.birth_year}`,
    profile.goal && `goal: ${profile.goal}`,
  ].filter(Boolean).join(', ') : '';

  const prompt = `You are Aellux — an ancient biological intelligence. Explain why this supplement was included in this person's protocol, grounded in their actual biomarkers.

SUPPLEMENT: ${name}${dose ? ` · ${dose}` : ''}
USER PROFILE: ${profileCtx || 'Not provided'}
RELEVANT BIOMARKERS: ${markerCtx || 'Not provided'}

Return ONLY valid JSON:
{
  "why_you": "2-3 sentences specific to THIS person's biomarkers explaining why they need this supplement. Reference their actual numbers.",
  "mechanism": "1-2 sentences explaining how this supplement works biologically.",
  "what_to_expect": "1-2 sentences on what they should notice or measure if it's working.",
  "best_practice": "1 sentence on timing, form, or co-factors that maximise absorption.",
  "caution": "1 sentence on any interactions or reasons to consult a doctor. If none relevant, write null."
}`;

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return json(JSON.parse(clean));
  } catch {
    return json({ error: 'Parse error' }, { status: 500 });
  }
}
