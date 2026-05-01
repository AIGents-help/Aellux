export const config = { runtime: 'edge' };

const EXTRACT_PROMPT = `You are a medical data extraction AI. Extract ALL health biomarkers from this document.

Return ONLY valid JSON in this exact format, no other text:
{
  "document_type": "blood_panel|wearable|dexa|sleep|microbiome|physician_note|other",
  "document_date": "YYYY-MM-DD or null",
  "patient_name": "name or null",
  "markers": [
    {
      "name": "exact marker name",
      "category": "metabolic|cardiovascular|hormonal|inflammatory|nutritional|sleep|fitness|body_composition|cognitive|gut|other",
      "value": 123.4,
      "unit": "mg/dL",
      "reference_range_low": 70,
      "reference_range_high": 99,
      "status": "optimal|elevated|low|borderline|normal",
      "trend_direction": "improving|worsening|stable|unknown"
    }
  ],
  "summary": "2-3 sentence clinical summary of what this document reveals",
  "flags": ["any critical findings worth highlighting"],
  "recommendations": ["specific actionable items based on results"]
}

Extract EVERY measurable value — hormones, vitamins, minerals, lipids, metabolic markers, inflammatory markers, sleep stages, HRV, VO2max, body fat %, lean mass, gut bacteria ratios, everything. If a value appears, extract it.`;

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
        model: 'claude-opus-4-6',
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
