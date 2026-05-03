export const config = { runtime: 'edge' };

function parseJSON(raw) {
  let text = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found');
  return JSON.parse(text.slice(start, end + 1));
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const body = await req.json();
  const { markers, type, maxTokens = 2000 } = body;

  const ms = markers.slice(0, 8).map(m => m.name + ':' + m.value + m.unit + '(' + m.status + ')').join(', ');

  const prompts = {
    meals: `Given biomarkers: ${ms}

Return ONLY this JSON (no markdown, be concise, max 3 meals):
{"key_insight":"one sentence","daily_targets":{"calories":2000,"protein":150,"carbs":200,"fat":65},"meals":[{"time":"Breakfast","name":"name","why":"one sentence referencing numbers","items":["item 1","item 2","item 3"],"macros":{"p":30,"c":45,"f":15,"cal":430},"targets":["marker"]}],"foods_to_avoid":["food — why"]}`,

    supps: `Given biomarkers: ${ms}

Return ONLY this JSON (no markdown, max 5 supplements):
{"key_insight":"one sentence","supplements":[{"name":"name","dose":"dose","timing":"when","why":"one sentence with numbers","targets_markers":["marker"],"expected_impact":"specific change","evidence_level":"strong","priority":1,"status":"active","cost_monthly":"$20","synergies":[],"contraindications":[]}],"total_foundation_cost":"$X/mo"}`,

    protocol: `Given biomarkers: ${ms}

Return ONLY this JSON (no markdown, max 5 protocols):
{"biggest_lever":"one sentence","key_insight":"one sentence","protocols":[{"id":"p1","tier":1,"time_of_day":"morning","action":"specific action","duration":"20 min","why":"one sentence with numbers","targets_markers":["marker"],"expected_impact":"specific change","frequency":"Daily"}],"avoid":["thing — why"]}`,

    synthesis: `Given biomarkers: ${ms}

Return ONLY this JSON (no markdown):
{"aellux_voice":"2 sentences starting with I have observed or Your biology reveals, referencing actual numbers","biological_age_estimate":"X years","bio_age_gap":"X years younger/older","focus_priority":"one specific action","primary_systems":{"metabolic":"one word assessment","cardiovascular":"one word","hormonal":"one word","inflammatory":"one word"},"critical_flags":["flag"],"biggest_wins":["win"]}`
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompts[type] || prompts.synthesis }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: 'Claude error: ' + err.slice(0,200) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? '{}';

    try {
      const result = parseJSON(rawText);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Parse failed: ' + e.message, raw: rawText.slice(0, 400) }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}