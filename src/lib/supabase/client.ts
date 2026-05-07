import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

// Module-level singleton — one browser client, one auth listener, one session lock.
// Multiple instances compete for the IndexedDB auth lock and cause AbortErrors.
let _client: SupabaseClient<Database> | null = null;

export const createClient = (): SupabaseClient<Database> => {
  if (_client) return _client;
  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _client;
};
