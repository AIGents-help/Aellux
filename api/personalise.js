export const config = { runtime: 'nodejs', maxDuration: 60 };

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
  const ms = markers.map(m => m.name + ': ' + m.value + m.unit + ' (' + m.status + ')').join('\n');

  const prompts = {
    meals: 'Precision nutrition AI. Return meal protocol for these biomarkers as raw JSON only:\n\n' + ms + '\n\nFormat: {"key_insight":"str","daily_targets":{"calories":0,"protein":0,"carbs":0,"fat":0},"meals":[{"time":"Breakfast","name":"str","why":"str","items":["str"],"macros":{"p":0,"c":0,"f":0,"cal":0},"targets":["str"]}],"foods_to_avoid":["str"]}',
    supps: 'Supplement expert AI. Return supplement stack for these biomarkers as raw JSON only:\n\n' + ms + '\n\nFormat: {"key_insight":"str","supplements":[{"name":"str","dose":"str","timing":"str","why":"str","priority":1,"status":"active","evidence_level":"strong","expected_impact":"str","cost_monthly":"$X","synergies":[],"contraindications":[]}],"total_foundation_cost":"$X/mo"}',
    protocol: 'Longevity AI. Return daily protocol for these biomarkers as raw JSON only:\n\n' + ms + '\n\nFormat: {"biggest_lever":"str","protocols":[{"id":"p1","tier":1,"time_of_day":"morning","action":"str","why":"str","expected_impact":"str","frequency":"Daily","targets_markers":[]}],"avoid":["str"],"key_insight":"str"}',
    synthesis: 'You are Aellux. Return synthesis as raw JSON only:\n\n' + ms + '\n\nFormat: {"aellux_voice":"I have observed...","biological_age_estimate":"X years","focus_priority":"str","critical_flags":[],"biggest_wins":[],"bio_age_gap":"str"}'
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompts[type] || prompts.synthesis }] }),
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