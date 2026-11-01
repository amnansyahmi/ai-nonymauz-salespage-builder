export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
/** Without Supabase keys the app runs in demo mode: pages live in the browser and publishing is off. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
