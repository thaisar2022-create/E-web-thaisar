/**
 * Supabase Client Configuration
 * Fallback to local demo mode if environment variables are not configured.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xqxdcijfyayssdasvpxs.supabase.co';

export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL;

export const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// Configured if anon key is present and not a dummy placeholder
export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY.trim().length > 10 &&
    SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

export const SUPABASE_STORAGE_BUCKET = 'thaisar-uploads';

const CLIENT_ID_STORAGE_KEY = 'thaisar_supabase_client_id';

/**
 * Returns a persistent unique client ID stored in localStorage so guest users
 * can sync their profile, documents, and orders without requiring complex login.
 */
export function getOrCreateClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!id || id.trim().length < 5) {
      id = 'client_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'client_guest_default';
  }
}
