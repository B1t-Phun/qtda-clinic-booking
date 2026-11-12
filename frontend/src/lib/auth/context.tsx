'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { AuthUser } from '@/types/auth';
import { logout } from './client';
import { ROLE_HOME, roleForPath } from './policy';

const Context = createContext<AuthUser | null>(null);
export function AuthProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState(user);
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    let checking = false;
    async function refresh() {
      if (document.visibilityState === 'hidden' || checking) return;
      checking = true;
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!active) return;
        if (response.status === 401 || response.status === 403) { window.location.replace('/login'); return; }
        if (!response.ok) return;
        const state = await response.json() as { user: AuthUser | null; needsMfa: boolean };
        if (state.needsMfa) window.location.replace('/auth/mfa');
        else if (!state.user) window.location.replace('/login');
        else if (state.user.id !== user.id || state.user.role !== user.role ||
          (roleForPath(pathname) && roleForPath(pathname) !== state.user.role)) window.location.replace(ROLE_HOME[state.user.role]);
        else setCurrentUser(state.user);
      } catch { /* APIs still authorize each request while the connection is unavailable. */ }
      finally { checking = false; }
    }
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cliniccare-auth') : null;
    if (channel) channel.onmessage = (event) => {
      if (event.data === 'signed-out') window.location.replace('/login');
      else void refresh();
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('pageshow', refresh); channel?.close(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user.id, user.role, pathname]);
  const required = roleForPath(pathname);
  if (required && required !== currentUser.role) return <p className="p-8 text-center">Đang kiểm tra quyền truy cập…</p>;
  return <Context.Provider value={currentUser}>{children}</Context.Provider>;
}
export function useAuth() {
  const user = useContext(Context);
  if (!user) throw new Error('AuthProvider missing');
  return { user, logout };
}
