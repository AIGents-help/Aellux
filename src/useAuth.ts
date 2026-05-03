import { useState, useEffect, createContext, useContext, createElement } from 'react';
import { upsertUser, getUser, upgradeUser } from './supabase';

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  customerId?: string;
  subscriptionId?: string;
  signedUpAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPro: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  upgradeToPro: (customerId: string, subscriptionId: string) => void;
  signOut: () => void;
}

const AuthCtx = createContext<AuthContextType>({
  user: null, loading: true, isPro: false,
  signIn: async () => ({}),
  signUp: async () => ({}),
  upgradeToPro: () => {},
  signOut: () => {},
});

// Simple password hashing using Web Crypto API
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('aellux_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }

    // Handle Stripe return
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId && params.get('upgraded') === 'true') {
      fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).then(async data => {
        if (data.active && data.email) {
          const dbUser = await upgradeUser(data.email, data.customerId, data.subscriptionId);
          const newUser: User = {
            id: dbUser?.id || data.email,
            email: data.email,
            plan: 'pro',
            customerId: data.customerId,
            subscriptionId: data.subscriptionId,
            signedUpAt: dbUser?.created_at || new Date().toISOString(),
          };
          setUser(newUser);
          localStorage.setItem('aellux_user', JSON.stringify(newUser));
        }
        window.history.replaceState({}, '', window.location.pathname);
      }).catch(() => window.history.replaceState({}, '', window.location.pathname));
    }

    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!email.includes('@')) return { error: 'Enter a valid email.' };
    if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

    const existing = await getUser(email);
    if (existing) return { error: 'An account with this email already exists. Sign in instead.' };

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const dbUser = await upsertUser(email, 'free', hash, salt);
    if (!dbUser) return { error: 'Failed to create account. Please try again.' };

    const newUser: User = {
      id: dbUser.id || email,
      email,
      plan: dbUser.plan || 'free',
      signedUpAt: dbUser.created_at || new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem('aellux_user', JSON.stringify(newUser));

    fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, plan: 'free', event: 'signup' }),
    }).catch(() => {});

    return {};
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!email.includes('@')) return { error: 'Enter a valid email.' };
    if (!password) return { error: 'Enter your password.' };

    const dbUser = await getUser(email);
    if (!dbUser) return { error: 'No account found with this email. Sign up instead.' };

    // Verify password
    if (dbUser.password_hash && dbUser.password_salt) {
      const hash = await hashPassword(password, dbUser.password_salt);
      if (hash !== dbUser.password_hash) return { error: 'Incorrect password.' };
    } else {
      // Legacy account (no password set) — set password now
      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      await upsertUser(email, dbUser.plan || 'free', hash, salt);
    }

    const newUser: User = {
      id: dbUser.id || email,
      email,
      plan: dbUser.plan || 'free',
      customerId: dbUser.customer_id,
      subscriptionId: dbUser.subscription_id,
      signedUpAt: dbUser.created_at || new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem('aellux_user', JSON.stringify(newUser));
    return {};
  };

  const upgradeToPro = (customerId: string, subscriptionId: string) => {
    if (!user) return;
    const upgraded = { ...user, plan: 'pro' as const, customerId, subscriptionId };
    setUser(upgraded);
    localStorage.setItem('aellux_user', JSON.stringify(upgraded));
    upgradeUser(user.email, customerId, subscriptionId);
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('aellux_user');
  };

  return createElement(AuthCtx.Provider, {
    value: { user, loading, isPro: user?.plan === 'pro', signIn, signUp, upgradeToPro, signOut }
  }, children);
}

export function useAuth() { return useContext(AuthCtx); }
