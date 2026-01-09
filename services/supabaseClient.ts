import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const COOKIE_MAX_AGE_DAYS = 90;

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  return cookie.substring(name.length + 1);
};

const setCookieValue = (name: string, value: string, maxAgeDays: number) => {
  if (typeof document === 'undefined') return;
  const maxAgeSeconds = Math.floor(maxAgeDays * 24 * 60 * 60);
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
};

const removeCookieValue = (name: string) => {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
};

const cookieStorage = {
  getItem: (key: string) => {
    const value = getCookieValue(key);
    return value ? decodeURIComponent(value) : null;
  },
  setItem: (key: string, value: string) => {
    setCookieValue(key, value, COOKIE_MAX_AGE_DAYS);
  },
  removeItem: (key: string) => {
    removeCookieValue(key);
  }
};

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: cookieStorage,
    storageKey: 'ff-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
