// @ts-nocheck
import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://dpweejtslbzmstcywcnl.supabase.co';

interface AdminUser {
  id: string;
  email: string;
  plan: string;
  signed_up_at: string;
  updated_at?: string;
  is_admin?: boolean;
}

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
}

interface Props { supabaseKey: string; }

export default function AdminDashboard({ supabaseKey }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/users?select=id,email,plan,signed_up_at,updated_at,is_admin&order=signed_up_at.desc', {
        headers: supabaseHeaders(supabaseKey)
      });
      const data = await r.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg('Error loading users');
    }
    setLoading(false);
  }

  async function updateUser(userId: string, updates: Partial<AdminUser>) {
    setSaving(true);
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + userId, {
        method: 'PATCH',
        headers: supabaseHeaders(supabaseKey),
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
      });
      if (r.ok) {
        setMsg('User updated');
        setSelected(null);
        loadUsers();
      } else {
        setMsg('Update failed');
      }
    } catch (e) {
      setMsg('Error updating user');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.plan?.toLowerCase().includes(search.toLowerCase())
  );

  const proCount = users.filter(u => u.plan === 'pro').length;
  const freeCount = users.filter(u => u.plan === 'free').length;

  const S = {
    card: { background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 10, padding: '20px 24px' },
    label: { fontSize: 11, color: 'rgba(0,210,165,.5)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 },
    val: { fontFamily: 'Georgia,serif', fontSize: 28, color: 'rgba(0,220,175,.95)' },
    th: { fontSize: 11, color: 'rgba(0,210,165,.45)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '10px 16px', textAlign: 'left' as const, borderBottom: '1px solid rgba(0,210,165,.1)' },
    td: { fontSize: 13, color: 'rgba(0,210,165,.75)', padding: '12px 16px', borderBottom: '1px solid rgba(0,210,165,.07)', verticalAlign: 'top' as const },
  };

  return (
    <div style={{ padding: '28px 28px', maxWidth: 960 }}>
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 26, color: 'rgba(0,210,165,.9)', fontWeight: 400, margin: '0 0 6px' }}>Admin Dashboard</h2>
      <p style={{ color: 'rgba(0,210,165,.45)', fontSize: 13, letterSpacing: '0.06em', margin: '0 0 28px' }}>USER MANAGEMENT</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Users', val: users.length },
          { label: 'Pro Members', val: proCount },
          { label: 'Free Users', val: freeCount },
        ].map(({ label, val }) => (
          <div key={label} style={S.card}>
            <div style={S.label}>{label}</div>
            <div style={S.val}>{val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or plan..."
          style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 8, color: 'rgba(0,220,175,.9)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }}
        />
      </div>

      {msg && <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(0,210,165,.1)', borderRadius: 6, fontSize: 13, color: 'rgba(0,210,165,.9)' }}>{msg}</div>}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(0,210,165,.4)', fontSize: 13 }}>Loading users...</div>
      ) : (
        <div style={{ background: 'rgba(0,210,165,.03)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Email</th>
                <th style={S.th}>Plan</th>
                <th style={S.th}>Joined</th>
                <th style={S.th}>Admin</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,210,165,.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={S.td}>{u.email}</td>
                  <td style={S.td}>
                    <span style={{ background: u.plan === 'pro' ? 'rgba(0,210,165,.15)' : 'rgba(0,210,165,.06)', border: '1px solid ' + (u.plan === 'pro' ? 'rgba(0,210,165,.4)' : 'rgba(0,210,165,.15)'), borderRadius: 20, padding: '2px 12px', fontSize: 11, color: u.plan === 'pro' ? 'rgba(0,210,165,.9)' : 'rgba(0,210,165,.45)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                      {u.plan || 'free'}
                    </span>
                  </td>
                  <td style={{ ...S.td, color: 'rgba(0,210,165,.45)', fontSize: 12 }}>{u.signed_up_at ? new Date(u.signed_up_at).toLocaleDateString() : 'unknown'}</td>
                  <td style={S.td}>{u.is_admin ? '✓' : '-'}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => updateUser(u.id, { plan: u.plan === 'pro' ? 'free' : 'pro' })}
                        style={{ padding: '4px 12px', fontSize: 11, borderRadius: 14, border: '1px solid rgba(0,210,165,.3)', background: 'transparent', color: 'rgba(0,210,165,.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {u.plan === 'pro' ? 'Downgrade' : 'Upgrade'}
                      </button>
                      <button onClick={() => updateUser(u.id, { is_admin: !u.is_admin })}
                        style={{ padding: '4px 12px', fontSize: 11, borderRadius: 14, border: '1px solid rgba(167,139,250,.3)', background: 'transparent', color: 'rgba(167,139,250,.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '32px', color: 'rgba(0,210,165,.3)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
