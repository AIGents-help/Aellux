import { sbSelect, sbUpsert, sbUpdate, json } from './_lib.js';

export const config = { runtime: 'edge' };

const SYSTEM = 'You are a precision medical-grade health intelligence. Respond with ONLY a single valid JSON object matching the requested schema. No prose, no markdown, no preamble. Start with { and end with }.';

function parseJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found');
  const candidate = text.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch { return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')); }
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key configured' }, { status: 500 });

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { name, category = '', unit = '' } = body || {};
  if (!name || typeof name !== 'string') return json({ error: 'Missing marker name' }, { status: 400 });

  const markerKey = name.trim().toLowerCase();

  // ── Cache lookup ───────────────────────────────────────────────────────────
  const cached = await sbSelect('biomarker_info_cache', `marker_key=eq.${encodeURIComponent(markerKey)}&select=info,hits&limit=1`);
  if (cached && cached.length > 0) {
    const row = cached[0];
    sbUpdate('biomarker_info_cache', `marker_key=eq.${encodeURIComponent(markerKey)}`, { hits: (row.hits || 0) + 1, last_hit_at: new Date().toISOString() }).catch(() => {});
    return json(row.info, { headers: { 'x-cache': 'HIT' } });
  }

  // ── AI generate ────────────────────────────────────────────────────────────
  const prompt = `Generate precise, evidence-based information for the biomarker: "${name}"${category ? ` (category: ${category})` : ''}${unit ? ` (typical unit: ${unit})` : ''}.

User context: sex=${sex || 'unknown'}${age ? `, age=${age}` : ''}. CRITICAL: All content must be appropriate for this user's sex. If sex is 'male', NEVER reference menstrual cycles, periods, vaginal dryness, breast tenderness, pregnancy, or any exclusively female physiology. If sex is 'female', NEVER reference prostate effects or exclusively male physiology. Tailor symptoms, mitigation strategies, and medical escalation to the user's actual biology.

Your philosophy: the body has intelligence. Lead with what the person can do themselves through lifestyle, nutrition, movement, sleep, and targeted supplementation. Pharmaceutical and medical interventions belong at the END as escalation — not the opening move. Be specific and mechanistic. Never vague.

Return ONLY this JSON schema (no markdown, no fences, no preamble):
{
  "what": "2 sentences: what this marker is biologically and what it reflects about the body's state",
  "why": "2 sentences: why this marker matters for health, longevity, and daily felt experience",
  "high": "2 sentences: what symptoms and risks the person may experience when this is elevated",
  "low": "2 sentences: what symptoms and risks occur when this is low — how it actually feels",
  "mitigateHigh": "3-4 sentences: HOLISTIC FIRST — specific foods, lifestyle changes, movement, sleep, stress interventions, targeted supplements to bring this down. Lead with the body's own mechanisms. Be specific: name the food, the dose, the mechanism.",
  "mitigateHighMedical": "1-2 sentences: when and why to involve a physician or consider medical intervention for elevated levels. Frame as escalation after lifestyle fails, or when severity warrants it.",
  "mitigateLow": "3-4 sentences: HOLISTIC FIRST — specific foods, lifestyle changes, movement, sleep, stress interventions, targeted supplements to bring this up. Be specific and mechanistic.",
  "mitigateLowMedical": "1-2 sentences: when and why to involve a physician or consider medical intervention for low levels. Frame as escalation.",
  "goodFor": "1-2 sentences: positive effects when in optimal range — how the person will feel and perform",
  "badFor": "1-2 sentences: chronic-imbalance risks in either direction"
}

Reference specific mechanisms, food sources, supplement doses, and timelines where relevant. Never refuse — give your best answer for any marker.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1800,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return json({ error: `Claude API ${response.status}: ${err.slice(0, 200)}` }, { status: 500 });
    }
    const data = await response.json();
    const rawText = data?.content?.[0]?.text ?? '';
    if (!rawText) return json({ error: 'Empty model response' }, { status: 500 });

    let info;
    try { info = parseJSON(rawText); }
    catch (e) { return json({ error: `Parse failed: ${e.message}`, raw: rawText.slice(0, 400) }, { status: 500 }); }

    // Persist (fire-and-forget; cache is global so even other users benefit)
    sbUpsert('biomarker_info_cache', { marker_key: markerKey, display_name: name, info, hits: 0, created_at: new Date().toISOString() }, 'marker_key').catch(() => {});

    return json(info, { headers: { 'x-cache': 'MISS' } });
  } catch (err) {
    return json({ error: err.message || 'unknown error' }, { status: 500 });
  }
}
