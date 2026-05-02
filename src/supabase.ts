import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  customer_id?: string;
  subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DbDocument {
  id: string;
  user_id: string;
  name: string;
  date: string;
  document_type: string;
  markers: any[];
  summary: string;
  flags: string[];
  recommendations: string[];
  uploaded_at: string;
}

export interface DbPersonalised {
  id: string;
  user_id: string;
  type: 'meals' | 'supps' | 'protocol' | 'synthesis';
  data: any;
  generated_at: string;
}

// ── USER OPS ───────────────────────────────────────────────────────────────

export async function upsertUser(email: string, plan: 'free' | 'pro' = 'free', extras: Partial<DbUser> = {}): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .upsert({ email, plan, ...extras, updated_at: new Date().toISOString() }, { onConflict: 'email' })
    .select()
    .single();
  if (error) { console.error('upsertUser:', error); return null; }
  return data;
}

export async function getUser(email: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error) return null;
  return data;
}

export async function upgradeUser(email: string, customerId: string, subscriptionId: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .update({ plan: 'pro', customer_id: customerId, subscription_id: subscriptionId, updated_at: new Date().toISOString() })
    .eq('email', email)
    .select()
    .single();
  if (error) { console.error('upgradeUser:', error); return null; }
  return data;
}

export async function downgradeUser(email: string): Promise<void> {
  await supabase
    .from('users')
    .update({ plan: 'free', subscription_id: null, updated_at: new Date().toISOString() })
    .eq('email', email);
}

// ── DOCUMENT OPS ───────────────────────────────────────────────────────────

export async function saveDocument(userId: string, doc: Omit<DbDocument, 'id' | 'user_id'>): Promise<DbDocument | null> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ user_id: userId, ...doc })
    .select()
    .single();
  if (error) { console.error('saveDocument:', error); return null; }
  return data;
}

export async function getDocuments(userId: string): Promise<DbDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function deleteDocument(docId: string, userId: string): Promise<void> {
  await supabase.from('documents').delete().eq('id', docId).eq('user_id', userId);
}

// ── PERSONALISED OPS ───────────────────────────────────────────────────────

export async function savePersonalised(userId: string, type: string, data: any): Promise<void> {
  await supabase
    .from('personalised')
    .upsert({ user_id: userId, type, data, generated_at: new Date().toISOString() }, { onConflict: 'user_id,type' });
}

export async function getPersonalised(userId: string): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('personalised')
    .select('*')
    .eq('user_id', userId);
  if (error || !data) return {};
  return Object.fromEntries(data.map(r => [r.type, r.data]));
}
