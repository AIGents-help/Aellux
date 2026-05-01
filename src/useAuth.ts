import { useState, useEffect } from 'react';

export interface User { id: string; email: string; }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for demo session
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

  return { user, loading, signIn, signOut };
}
