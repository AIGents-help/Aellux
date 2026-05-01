import { useState, useEffect, createContext, useContext, createElement } from 'react';

export interface User { id: string; email: string; }

interface AuthContext {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
}

const AuthCtx = createContext<AuthContext>({
  user: null, loading: true,
  signIn: () => {}, signOut: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('aellux_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const signIn = (email: string) => {
    const u = { id: '1', email };
    localStorage.setItem('aellux_user', JSON.stringify(u));
    setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem('aellux_user');
    setUser(null);
  };

  return createElement(AuthCtx.Provider, { value: { user, loading, signIn, signOut } }, children);
}

export function useAuth() {
  return useContext(AuthCtx);
}
