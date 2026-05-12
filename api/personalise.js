export const config = { runtime: 'edge' };

function parseJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in model output');
  // Try direct parse first
  const candidate = text.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch (e1) {
    // Tolerate trailing commas
    const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(cleaned);
  }
}

const SYSTEM = 'You are Aellux, a precision health intelligence. You MUST respond with ONLY a single valid JSON object matching the schema given. No prose, no explanation, no markdown fences, no preamble. Start your response with { and end with }.';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { markers, type, maxTokens = 2000, preference = null } = body || {};
  if (!Array.isArray(markers) || markers.length === 0) {
    return new Response(JSON.stringify({ error: 'No markers provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Include up to 20 markers for richer context (was 8)
  const ms = markers.slice(0, 20).map(m => `${m.name}:${m.value}${m.unit || ''}(${m.status || 'unknown'})`).join(', ');

  const prompts = {
    meals: `User biomarkers: ${ms}${preference && preference !== 'none' ? `\nDiet style: ${preference}. Tailor meals to this style while respecting biomarkers.` : ''}

Schema (return ONLY this JSON, max 3 meals):
{"key_insight":"one sentence","daily_targets":{"calories":2000,"protein":150,"carbs":200,"fat":65},"meals":[{"time":"Breakfast","name":"name","why":"one sentence referencing the user's actual numbers","items":["item 1","item 2","item 3"],"macros":{"p":30,"c":45,"f":15,"cal":430},"targets":["marker name"]}],"foods_to_avoid":["food — why"]}`,

    supps: `User biomarkers: ${ms}

Schema (return ONLY this JSON, max 5 supplements):
{"key_insight":"one sentence","supplements":[{"name":"name","dose":"dose","timing":"when","why":"one sentence with user's numbers","targets_markers":["marker"],"expected_impact":"specific change","evidence_level":"strong","priority":1,"status":"active","cost_monthly":"$20","synergies":[],"contraindications":[]}],"total_foundation_cost":"$X/mo"}`,

    protocol: `User biomarkers: ${ms}

Schema (return ONLY this JSON, max 5 protocols):
{"biggest_lever":"one sentence","key_insight":"one sentence","protocols":[{"id":"p1","tier":1,"time_of_day":"morning","action":"specific action","duration":"20 min","why":"one sentence with user's numbers","targets_markers":["marker"],"expected_impact":"specific change","frequency":"Daily"}],"avoid":["thing — why"]}`,

    synthesis: `User biomarkers: ${ms}

Schema (return ONLY this JSON):
{"aellux_voice":"2 sentences starting with I have observed or Your biology reveals, referencing actual numbers","biological_age_estimate":"X years","bio_age_gap":"X years younger/older","focus_priority":"one specific action","primary_systems":{"metabolic":"one word","cardiovascular":"one word","hormonal":"one word","inflammatory":"one word"},"critical_flags":["flag"],"biggest_wins":["win"]}`
  };

  const promptForType = prompts[type] || prompts.synthesis;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system: SYSTEM,
        messages: [{ role: 'user', content: promptForType }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[personalise] Anthropic API non-ok', response.status, err.slice(0, 300));
      return new Response(JSON.stringify({ error: `Claude API ${response.status}: ${err.slice(0, 200)}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text ?? '';
    if (!rawText) {
      return new Response(JSON.stringify({ error: 'Empty model response', raw: JSON.stringify(data).slice(0, 300) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const result = parseJSON(rawText);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('[personalise] Parse failed', e.message, 'raw:', rawText.slice(0, 400));
      return new Response(JSON.stringify({ error: `Parse failed: ${e.message}`, raw: rawText.slice(0, 400) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    console.error('[personalise] fetch threw', err);
    return new Response(JSON.stringify({ error: err.message || 'unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}