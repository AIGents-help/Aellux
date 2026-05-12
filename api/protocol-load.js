import { sbSelect } from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 10 };

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const { userId } = req.query || {};
  if (!userId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'userId required' }));
  }

  // Load user's most recent full (non-preview) protocol
  const rows = await sbSelect(
    'meal_plans',
    `user_id=eq.${userId}&is_preview=eq.false&order=created_at.desc&limit=1&select=*`
  );

  if (rows && rows.length > 0) {
    const p = rows[0];
    res.statusCode = 200;
    return res.end(JSON.stringify({
      protocol: {
        id: p.id,
        weekData: p.meals,
        mealStyle: p.meal_style || 'none',
        additionalGoal: p.additional_goal || '',
        cycleLengthDays: p.cycle_length_days || 30,
        cycleStartedAt: p.cycle_started_at || p.created_at,
        createdAt: p.created_at,
        isPreview: false,
      }
    }));
  }

  // Fall back to preview if no full protocol
  const previewRows = await sbSelect(
    'meal_plans',
    `user_id=eq.${userId}&is_preview=eq.true&order=created_at.desc&limit=1&select=*`
  );

  if (previewRows && previewRows.length > 0) {
    const p = previewRows[0];
    res.statusCode = 200;
    return res.end(JSON.stringify({
      protocol: {
        id: p.id,
        weekData: p.meals,
        mealStyle: p.meal_style || 'none',
        additionalGoal: p.additional_goal || '',
        cycleLengthDays: p.cycle_length_days || 30,
        cycleStartedAt: p.cycle_started_at || p.created_at,
        createdAt: p.created_at,
        isPreview: true,
      }
    }));
  }

  // No protocol found — user needs to generate
  res.statusCode = 200;
  return res.end(JSON.stringify({ protocol: null }));
}
