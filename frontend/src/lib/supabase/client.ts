'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '@/types/auth';
import { authRequest } from '@/lib/auth/client';

let singleton: ReturnType<typeof makeClient> | undefined;
function makeClient() {
  // Existing .from(...).select/update/insert calls stay intact. JWTs remain in HttpOnly cookies.
  const db = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => {
          const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
          const prefix = '/rest/v1/';
          if (!url.pathname.startsWith(prefix)) throw new Error('Unsupported browser Supabase operation');
          const headers = new Headers(init?.headers);
          headers.delete('authorization');
          headers.delete('apikey');
          return fetch('/api/data/' + url.pathname.slice(prefix.length) + url.search, {
            ...init, headers, credentials: 'same-origin', cache: 'no-store',
          });
        },
      },
    },
  );
  return {
    from: db.from.bind(db),
    rpc: db.rpc.bind(db),
    auth: {
      async getUser() {
        const response = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) throw new Error('Không thể kiểm tra phiên đăng nhập.');
        const { user } = await response.json() as { user: AuthUser | null };
        return { data: { user }, error: null };
      },
      async signOut() { await authRequest('logout', {}); return { error: null }; },
    },
  };
}

export function createClient() {
  singleton ??= makeClient();
  return singleton;
}
