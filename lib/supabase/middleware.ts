import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Gracefully bypass if environment variables are not set yet (e.g. initial deployment)
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh auth token
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Admin route protection
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    console.error('Middleware updateSession error:', err);
  }

  return supabaseResponse;
}
