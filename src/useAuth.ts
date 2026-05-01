import { useState, useEffect, createContext, useContext, createElement } from 'react';

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
  signIn: (email: string) => void;
  upgradeToPro: (customerId: string, subscriptionId: string) => void;
  signOut: () => void;
}

const AuthCtx = createContext<AuthContextType>({
  user: null, loading: true, isPro: false,
  signIn: () => {}, upgradeToPro: () => {}, signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('aellux_user');
    if (stored) {
      try {
        const u = JSON.parse(stored) as User;
        setUser(u);
        // Re-verify pro status against Stripe if they have an email
        if (u.email && u.plan === 'pro') {
          verifyPro(u.email).then(result => {
            if (!result.active && u.plan === 'pro') {
              const downgraded = { ...u, plan: 'free' as const };
              setUser(downgraded);
              localStorage.setItem('aellux_user', JSON.stringify(downgraded));
            }
          }).catch(() => {});
        }
      } catch {}
    }

    // Check URL for Stripe return
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const upgraded = params.get('upgraded');
    if (sessionId && upgraded === 'true') {
      // Verify the session
      fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).then(data => {
        if (data.active && data.email) {
          const newUser: User = {
            id: data.customerId || data.email,
            email: data.email,
            plan: 'pro',
            customerId: data.customerId,
            subscriptionId: data.subscriptionId,
            signedUpAt: new Date().toISOString(),
          };
          setUser(newUser);
          localStorage.setItem('aellux_user', JSON.stringify(newUser));
        }
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }).catch(() => {
        window.history.replaceState({}, '', window.location.pathname);
      });
    }

    setLoading(false);
  }, []);

  const signIn = (email: string) => {
    const existing = localStorage.getItem('aellux_user');
    let existingUser: User | null = null;
    try { if (existing) existingUser = JSON.parse(existing); } catch {}

    // Keep existing pro status if same email
    if (existingUser && existingUser.email === email) {
      setUser(existingUser);
      return;
    }

    const newUser: User = {
      id: email,
      email,
      plan: 'free',
      signedUpAt: new Date().toISOString(),
    };
    setUser(newUser);
    localStorage.setItem('aellux_user', JSON.stringify(newUser));
  };

  const upgradeToPro = (customerId: string, subscriptionId: string) => {
    if (!user) return;
    const upgraded = { ...user, plan: 'pro' as const, customerId, subscriptionId };
    setUser(upgraded);
    localStorage.setItem('aellux_user', JSON.stringify(upgraded));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('aellux_user');
  };

  return createElement(AuthCtx.Provider, {
    value: { user, loading, isPro: user?.plan === 'pro', signIn, upgradeToPro, signOut }
  }, children);
}

async function verifyPro(email: string): Promise<{ active: boolean }> {
  const res = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export function useAuth() {
  return useContext(AuthCtx);
}
