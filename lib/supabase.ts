import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Clave publicable (o la anon key en proyectos anteriores). Nunca la secret key ni la service_role.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && key);
export const supabase: SupabaseClient | null = configurado ? createClient(url!, key!) : null;
