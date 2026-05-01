import { useState, useEffect, createContext, useContext, createElement } from 'react';
import { supabase, upsertUser, getUser, upgradeUser } from './supabase';

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
  signIn: (email: string) => Promise<void>;
  upgradeToPro: (customerId: string, subscriptionId: string) => void;
  signOut: () => void;
}

const AuthCtx = createContext<AuthContextType>({
  user: null, loading: true, isPro: false,
  signIn: async () => {}, upgradeToPro: () => {}, signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage first for instant UI
    const stored = localStorage.getItem('aellux_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }

    // Check URL for Stripe return
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

  const signIn = async (email: string) => {
    // Check Supabase first (existing user with pro plan)
    let dbUser = await getUser(email);

    if (!dbUser) {
      // New user — create in Supabase + log to Notion CRM
      dbUser = await upsertUser(email, 'free');
      // Fire and forget CRM log
      fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: 'free', event: 'signup' }),
      }).catch(() => {});
    }

    const newUser: User = {
      id: dbUser?.id || email,
      email,
      plan: dbUser?.plan || 'free',
      customerId: dbUser?.customer_id,
      subscriptionId: dbUser?.subscription_id,
      signedUpAt: dbUser?.created_at || new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem('aellux_user', JSON.stringify(newUser));
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
    value: { user, loading, isPro: user?.plan === 'pro', signIn, upgradeToPro, signOut }
  }, children);
}

export function useAuth() { return useContext(AuthCtx); }
