export function useRoute() {
  if (typeof window === 'undefined') return '/admin';
  return window.location.pathname;
}

export const navigate = (p: string) => {
  if (typeof window !== 'undefined') {
    const target = p.startsWith('/admin') ? p : `/admin${p.startsWith('/') ? '' : '/'}${p}`;
    window.location.href = target;
  }
};
