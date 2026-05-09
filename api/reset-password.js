export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://dpweejtslbzmstcywcnl.supabase.co';
const RESEND_API = 'https://api.resend.com/emails';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const APP_URL = process.env.VITE_APP_URL || 'https://aellux.health';

  try {
    const { action, email, token, newPassword } = await req.json();

    // ── STEP 1: Request reset — generate token, store it, send email ──────────
    if (action === 'request') {
      if (!email || !email.includes('@')) {
        return json({ error: 'Enter a valid email address.' }, 400);
      }

      if (!RESEND_KEY) {
        console.error('[reset-password] RESEND_API_KEY is not set');
        return json({ error: 'Email service not configured.' }, 500);
      }

      // Check user exists
      const userRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email.trim())}&select=id,email`,
        { headers: supabaseHeaders(SUPABASE_KEY) }
      );
      const users = await userRes.json();
      if (!users?.length) {
        // Return success anyway — don't reveal whether email exists
        return json({ success: true });
      }

      // Generate a secure token (hex, 32 bytes)
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const resetToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      // Store token in DB
      await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens`, {
        method: 'POST',
        headers: { ...supabaseHeaders(SUPABASE_KEY), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ email: email.trim(), token: resetToken, expires_at: expiresAt, used: false }),
      });

      // Send reset email via Resend
      const resetUrl = `${APP_URL}?reset_token=${resetToken}&email=${encodeURIComponent(email.trim())}`;
      const resendRes = await fetch(RESEND_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Aellux <${FROM_EMAIL}>`,
          to: [email.trim()],
          subject: 'Reset your Aellux password',
          html: `
<div style="font-family:Georgia,serif;background:#030d14;color:#a8ffe8;padding:40px;max-width:480px;margin:0 auto;border-radius:8px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="width:52px;height:52px;border-radius:50%;background:radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%);margin:0 auto 16px;"></div>
    <h1 style="font-size:32px;color:#a8ffe8;margin:0;font-weight:500;">Aellux</h1>
  </div>
  <p style="color:rgba(0,210,165,.85);font-size:17px;line-height:1.7;margin-bottom:8px;">You requested a password reset.</p>
  <p style="color:rgba(0,180,145,.6);font-size:15px;line-height:1.7;margin-bottom:28px;">This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>
  <div style="text-align:center;margin-bottom:28px;">
    <a href="${resetUrl}" style="display:inline-block;background:rgba(0,210,165,.9);color:#030d14;font-size:16px;font-weight:600;padding:14px 36px;border-radius:6px;text-decoration:none;font-family:Georgia,serif;">Reset My Password</a>
  </div>
  <p style="color:rgba(0,155,125,.4);font-size:13px;text-align:center;">Or copy this link: <span style="color:rgba(0,185,145,.5);word-break:break-all;">${resetUrl}</span></p>
</div>
`,
        }),
      });

      if (!resendRes.ok) {
        const resendErr = await resendRes.json().catch(() => ({}));
        console.error('[reset-password] Resend error:', resendRes.status, JSON.stringify(resendErr));
        return json({ error: 'Failed to send reset email. Please try again.' }, 500);
      }

      console.log('[reset-password] Reset email sent to', email.trim());
      return json({ success: true });
    }

    // ── STEP 2: Verify token is valid ─────────────────────────────────────────
    if (action === 'verify') {
      if (!token || !email) return json({ valid: false }, 400);
      const valid = await checkToken(SUPABASE_KEY, email, token);
      return json({ valid });
    }

    // ── STEP 3: Apply new password ────────────────────────────────────────────
    if (action === 'reset') {
      if (!token || !email || !newPassword) return json({ error: 'Missing fields.' }, 400);
      if (newPassword.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);

      const valid = await checkToken(SUPABASE_KEY, email, token);
      if (!valid) return json({ error: 'Reset link has expired or already been used. Request a new one.' }, 400);

      // Hash new password
      const salt = generateHex(16);
      const hash = await hashPassword(newPassword, salt);

      // Update user
      await fetch(
        `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email.trim())}`,
        {
          method: 'PATCH',
          headers: { ...supabaseHeaders(SUPABASE_KEY), 'Content-Type': 'application/json' },
          body: JSON.stringify({ password_hash: hash, password_salt: salt, updated_at: new Date().toISOString() }),
        }
      );

      // Mark token as used
      await fetch(
        `${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(email.trim())}&token=eq.${token}`,
        {
          method: 'PATCH',
          headers: { ...supabaseHeaders(SUPABASE_KEY), 'Content-Type': 'application/json' },
          body: JSON.stringify({ used: true }),
        }
      );

      return json({ success: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('[reset-password] Uncaught error:', err.message);
    return json({ error: err.message || 'Server error.' }, 500);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function supabaseHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function generateHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkToken(SUPABASE_KEY, email, token) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(email)}&token=eq.${token}&used=eq.false&select=expires_at`,
    { headers: supabaseHeaders(SUPABASE_KEY) }
  );
  const rows = await res.json();
  if (!rows?.length) return false;
  return new Date(rows[0].expires_at) > new Date();
}
