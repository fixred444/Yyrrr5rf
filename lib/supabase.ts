import { createClient } from "@supabase/supabase-js";

// Fallback mencegah Next.js prerender gagal saat build. Aplikasi tetap memerlukan
// Environment Variables yang valid saat dijalankan di Vercel.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
