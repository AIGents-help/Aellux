export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const { markers, type, maxTokens = 2500 } = await req.json();

  const markerSummary = markers.map(m => `${m.name}: ${m.value}${m.unit} (${m.status}${m.reference_range_low ? `, ref: ${m.reference_range_low}-${m.reference_range_high}` : ''})`).join('\n');

  const prompts = {
    meals: `You are a precision nutrition expert. Based on these exact biomarkers, generate a personalised meal protocol.

BIOMARKERS:
${markerSummary}

Return ONLY valid JSON:
{
  "meals": [
    {
      "time": "Breakfast|Lunch|Dinner|Snack",
      "name": "meal name",
      "targets": ["which specific biomarkers this meal addresses"],
      "why": "precise mechanistic explanation referencing actual numbers",
      "items": ["ingredient with portion"],
      "macros": { "p": 0, "c": 0, "f": 0, "cal": 0 },
      "tag": "label",
      "tagColor": "rgba(r,g,b,.85)"
    }
  ],
  "daily_targets": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
  "foods_to_avoid": ["food and why"],
  "key_insight": "most important nutritional finding from the biomarkers"
}`,

    supps: `You are a supplement protocol expert. Based on these exact biomarkers, generate a personalised supplement stack ranked by impact.

BIOMARKERS:
${markerSummary}

Return ONLY valid JSON:
{
  "supplements": [
    {
      "name": "supplement name",
      "dose": "exact dose",
      "timing": "when and how to take",
      "why": "precise mechanistic explanation referencing actual biomarker numbers",
      "targets_markers": ["which markers this addresses"],
      "expected_impact": "specific expected change",
      "evidence_level": "strong|moderate|emerging",
      "priority": 1,
      "status": "active|consider|optional",
      "cost_monthly": "$X",
      "synergies": ["synergistic supplements"],
      "contraindications": ["any warnings"]
    }
  ],
  "total_foundation_cost": "$X/mo",
  "key_insight": "most important finding driving the protocol"
}`,

    protocol: `You are a longevity and performance optimisation expert. Based on these exact biomarkers, generate a personalised daily protocol.

BIOMARKERS:
${markerSummary}

Return ONLY valid JSON:
{
  "protocols": [
    {
      "id": "p1",
      "tier": 1,
      "time_of_day": "morning|midday|evening|anytime",
      "action": "specific action",
      "duration": "time or reps",
      "why": "precise mechanistic explanation referencing actual numbers",
      "targets_markers": ["markers addressed"],
      "expected_impact": "specific expected change",
      "frequency": "Daily|3x/week|etc"
    }
  ],
  "biggest_lever": "the single highest-impact change based on their data",
  "avoid": ["things to stop doing and why"],
  "key_insight": "most important finding"
}`,

    synthesis: `You are Aellux — an ancient biological intelligence. Analyse these biomarkers and provide deep synthesis.

BIOMARKERS:
${markerSummary}

Return ONLY valid JSON:
{
  "biological_age_estimate": "estimate based on markers",
  "primary_systems": {
    "metabolic": "assessment",
    "cardiovascular": "assessment", 
    "hormonal": "assessment",
    "inflammatory": "assessment",
    "recovery": "assessment"
  },
  "critical_flags": ["urgent items requiring attention"],
  "biggest_wins": ["top improvements observed"],
  "aellux_voice": "2-3 sentences in Aellux voice — ancient intelligence observing specific patterns. Reference actual numbers.",
  "focus_priority": "the ONE thing to fix first and why",
  "bio_age_gap": "years older or younger than chronological age based on markers"
}`
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompts[type] || prompts.synthesis }],
    }),
  });

  const data = await response.json();
  const rawText = data.content?.[0]?.text ?? '{}';
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Parse failed', raw: rawText };
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw: rawText.substring(0, 300) }), { headers: { 'Content-Type': 'application/json' } });
  }
}
