export const config = { runtime: 'edge' };

function parseJSON(raw) {
  let text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  return JSON.parse(text.slice(start, end + 1));
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const body = await req.json();
  const { markers, type, maxTokens = 3000 } = body;

  const markerSummary = markers.map(m => `${m.name}: ${m.value}${m.unit} (${m.status}${m.reference_range_low != null ? `, ref: ${m.reference_range_low}-${m.reference_range_high}` : ''})`).join('\n');

  const prompts = {
    meals: `You are a precision nutrition expert. Generate a personalised meal protocol based on these biomarkers.

BIOMARKERS:
${markerSummary}

Return raw JSON only (no markdown, no backticks, no code fences):
{
  "meals": [
    {
      "time": "Breakfast",
      "name": "meal name",
      "targets": ["biomarkers addressed"],
      "why": "mechanistic explanation with actual numbers",
      "items": ["ingredient with portion"],
      "macros": { "p": 30, "c": 40, "f": 15, "cal": 400 }
    }
  ],
  "daily_targets": { "calories": 2000, "protein": 150, "carbs": 200, "fat": 70 },
  "foods_to_avoid": ["food — reason"],
  "key_insight": "most important nutritional finding"
}`,

    supps: `You are a supplement protocol expert. Generate a personalised supplement stack based on these biomarkers.

BIOMARKERS:
${markerSummary}

Return raw JSON only (no markdown, no backticks, no code fences):
{
  "supplements": [
    {
      "name": "supplement",
      "dose": "exact dose",
      "timing": "when to take",
      "why": "mechanistic explanation with actual numbers",
      "targets_markers": ["markers addressed"],
      "expected_impact": "specific expected change",
      "evidence_level": "strong",
      "priority": 1,
      "status": "active",
      "cost_monthly": "$20",
      "synergies": [],
      "contraindications": []
    }
  ],
  "total_foundation_cost": "$50/mo",
  "key_insight": "most important finding"
}`,

    protocol: `You are a longevity expert. Generate a personalised daily protocol based on these biomarkers.

BIOMARKERS:
${markerSummary}

Return raw JSON only (no markdown, no backticks, no code fences):
{
  "protocols": [
    {
      "id": "p1",
      "tier": 1,
      "time_of_day": "morning",
      "action": "specific action",
      "duration": "30 minutes",
      "why": "mechanistic explanation with actual numbers",
      "targets_markers": ["markers"],
      "expected_impact": "specific change",
      "frequency": "Daily"
    }
  ],
  "biggest_lever": "single highest-impact change",
  "avoid": ["things to stop and why"],
  "key_insight": "most important finding"
}`,

    synthesis: `You are Aellux, an ancient biological intelligence. Synthesise these biomarkers.

BIOMARKERS:
${markerSummary}

Return raw JSON only (no markdown, no backticks, no code fences):
{
  "biological_age_estimate": "estimate",
  "primary_systems": { "metabolic": "assessment", "cardiovascular": "assessment", "hormonal": "assessment", "inflammatory": "assessment" },
  "critical_flags": ["urgent items"],
  "biggest_wins": ["top improvements"],
  "aellux_voice": "2-3 sentences referencing actual numbers",
  "focus_priority": "ONE thing to fix first",
  "bio_age_gap": "years older/younger"
}`
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
      return new Response(JSON.stringify({ error: 'Claude API error: ' + err }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? '{}';
    
    try {
      const result = parseJSON(rawText);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Parse failed: ' + e.message, raw: rawText.substring(0, 300) }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
