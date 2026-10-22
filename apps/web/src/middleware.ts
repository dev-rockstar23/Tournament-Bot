import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Resolve Supabase URL — support both NEXT_PUBLIC_ and plain variants
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  // If Supabase is not configured, let the request through (dev/preview fallback)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  // Refresh session cookies
  let response: NextResponse
  try {
    response = await updateSession(request)
  } catch (updateErr) {
    console.error('[middleware] updateSession failed:', updateErr)
    response = NextResponse.next()
  }

  // Protect /servers/* routes — redirect to home if not authenticated
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/servers')) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (authErr) {
      console.error('[middleware] auth check failed:', authErr)
      // On auth error, allow through to let the page handle it gracefully
      // (The page will show appropriate error UI)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
