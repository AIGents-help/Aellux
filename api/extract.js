export const config = { runtime: 'edge' };

const EXTRACT_PROMPT = `You are a precision health biomarker extraction AI. Extract HEALTH BIOMARKERS ONLY — values that reflect the body's internal biological state.

Return ONLY valid JSON in this exact format, no other text:
{
  "document_type": "blood_panel|wearable|dexa|sleep|microbiome|physician_note|genetic|other",
  "document_date": "YYYY-MM-DD or null",
  "patient_name": "name or null",
  "markers": [
    {
      "name": "exact marker name",
      "category": "metabolic|cardiovascular|hormonal|inflammatory|nutritional|sleep|fitness|body_composition|cognitive|gut|genetic|other",
      "value": 123.4,
      "unit": "mg/dL",
      "reference_range_low": 70,
      "reference_range_high": 99,
      "status": "optimal|elevated|low|borderline|normal",
      "trend_direction": "improving|worsening|stable|unknown"
    }
  ],
  "summary": "2-3 sentence summary of what this document reveals about the person's health",
  "flags": ["any critical health findings worth highlighting"],
  "recommendations": ["specific actionable items based on results"]
}

EXTRACT these health biomarkers: hormones (testosterone, estrogen, cortisol, thyroid, DHEA, IGF-1), blood lipids (LDL, HDL, ApoB, triglycerides), metabolic (glucose, HbA1c, insulin, creatinine, albumin), inflammatory (CRP, IL-6, homocysteine), nutritional (vitamin D, B12, ferritin, magnesium, zinc, iron), sleep quality metrics (deep sleep %, REM %, HRV, sleep efficiency, sleep score), body composition (body fat %, lean mass, visceral fat, bone density, T-score), fitness physiology (VO2max, resting heart rate, recovery score, lactate threshold), gut health (diversity scores, pathogen flags), genetic variants with health implications.

NEVER EXTRACT — these are device artifacts, not health biomarkers:
- GPS/device telemetry: GPS accuracy, horizontal accuracy, vertical accuracy, GPS signal quality, hAcc, vAcc, HDOP, PDOP, satellite count, GPS route data, elevation, elevation gain, elevation change, speed in m/s, route duration (GPS), distance traveled
- Raw sensor signals: ECG raw signal in µV, accelerometer readings, gyroscope data, status_code values
- Supplement intake logs (what was TAKEN, not measured in blood): "Magnesium Glycinate 300mg dose", "Vitamin D3 supplemental drops" — only extract measured blood/serum/tissue levels
- Food diary entries: "leafy greens intake cups/day", "protein intake servings", "microgreens intake" — these are diet logs, not biomarkers
- Duplicate marker names: if the same marker appears with slightly different names (e.g. "SHBG" and "SHBG (Sex Hormone Binding Globulin)"), extract it ONCE with the shorter clean name
- Aggregate counts without clinical meaning: "pathogenic variants count", "variants of uncertain significance count" — extract the specific named gene variants instead`

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await req.json();
    const { fileContent, fileType, fileName, maxTokens = 4000 } = body;

    let messageContent;

    if (fileType === 'application/pdf' || fileType?.includes('image')) {
      // Send as document/image to Claude
      const mediaType = fileType === 'application/pdf' ? 'application/pdf' : fileType;
      const contentType = fileType === 'application/pdf' ? 'document' : 'image';
      messageContent = [
        {
          type: contentType,
          source: { type: 'base64', media_type: mediaType, data: fileContent }
        },
        { type: 'text', text: `File name: ${fileName}\n\nExtract all health biomarkers from this document.` }
      ];
    } else {
      // Text/CSV content
      messageContent = `File: ${fileName}\n\nContent:\n${fileContent}\n\nExtract all health biomarkers.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system: EXTRACT_PROMPT,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? '{}';

    // Parse JSON from response
    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Could not parse extraction', raw: rawText };
    } catch {
      extracted = { error: 'JSON parse failed', raw: rawText.substring(0, 500) };
    }

    return new Response(JSON.stringify(extracted), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
