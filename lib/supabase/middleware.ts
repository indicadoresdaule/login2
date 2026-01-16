import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { checkRouteAccess } from "@/lib/auth/route-protection"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  await supabase.auth.getUser()

  const accessResponse = await checkRouteAccess(request, supabase)

  if (accessResponse) {
    // Copiar las cookies al response de redirección
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      accessResponse.cookies.set(cookie.name, cookie.value)
    })
    return accessResponse
  }

  return supabaseResponse
}
