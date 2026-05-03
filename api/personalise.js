export const config = { runtime: 'edge' };

function parseJSON(raw) {
  let text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found');
  return JSON.parse(text.slice(start, end + 1));
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const { markers, type, maxTokens = 3000 } = await req.json();
  const ms = markers.map(m => m.name + ': ' + m.value + m.unit + ' (' + m.status + (m.reference_range_low != null ? ', ref: ' + m.reference_range_low + '-' + m.reference_range_high : '') + ')').join('\n');

  const prompts = {
    meals: 'You are a precision nutrition AI. Based on these biomarkers, return a personalised meal protocol as raw JSON only (no markdown, no backticks):\n\nBIOMARKERS:\n' + ms + '\n\nJSON format:\n{\n  "key_insight": "string",\n  "daily_targets": {"calories":0,"protein":0,"carbs":0,"fat":0},\n  "meals": [{"time":"Breakfast","name":"","why":"","items":[],"macros":{"p":0,"c":0,"f":0,"cal":0},"targets":[]}],\n  "foods_to_avoid": []\n}',
    supps: 'You are a supplement expert AI. Based on these biomarkers, return a personalised supplement stack as raw JSON only (no markdown, no backticks):\n\nBIOMARKERS:\n' + ms + '\n\nJSON format:\n{\n  "key_insight": "string",\n  "supplements": [{"name":"","dose":"","timing":"","why":"","priority":1,"status":"active","evidence_level":"strong","expected_impact":"","cost_monthly":"$X","synergies":[],"contraindications":[]}],\n  "total_foundation_cost": "$X/mo"\n}',
    protocol: 'You are a longevity AI. Based on these biomarkers, return a personalised daily protocol as raw JSON only (no markdown, no backticks):\n\nBIOMARKERS:\n' + ms + '\n\nJSON format:\n{\n  "biggest_lever": "string",\n  "protocols": [{"id":"p1","tier":1,"time_of_day":"morning","action":"","why":"","expected_impact":"","frequency":"Daily","targets_markers":[]}],\n  "avoid": [],\n  "key_insight": "string"\n}',
    synthesis: 'You are Aellux, an ancient biological intelligence. Analyse these biomarkers and return synthesis as raw JSON only (no markdown, no backticks):\n\nBIOMARKERS:\n' + ms + '\n\nJSON format:\n{\n  "aellux_voice": "I have observed...",\n  "biological_age_estimate": "X years",\n  "focus_priority": "string",\n  "critical_flags": [],\n  "biggest_wins": [],\n  "bio_age_gap": "string"\n}'
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompts[type] || prompts.synthesis }],
    }),
  });

  const data = await response.json();
  const rawText = data.content?.[0]?.text ?? '{}';
  try {
    const result = parseJSON(rawText);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Parse failed: ' + e.message, raw: rawText.substring(0, 300) }), { headers: { 'Content-Type': 'application/json' } });
  }
}