import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type Place = {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  spots: number;
  pinned: boolean;
  distance_m: number;
  created_at: string;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, { auth: { persistSession: false } })
  : null;

export async function togglePinned(id: string): Promise<boolean | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("toggle_pinned", { p_id: id });
  if (error) throw error;
  return typeof data === "boolean" ? data : null;
}
