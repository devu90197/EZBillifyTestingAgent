import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Server-side Supabase client bound to the request's cookies (Next 16: cookies() is async). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component (read-only cookies). Safe to ignore —
            // proxy.ts refreshes the session on the next request.
          }
        },
      },
    },
  );
}
