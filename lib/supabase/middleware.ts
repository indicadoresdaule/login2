import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas que requieren autenticación pero no verificación de rol específico
  const authRoutes = ["/perfil", "/avances"]
  
  // Reportes: SOLO administradores, docentes, tecnicos
  const reportesRoute = "/reportes"
  
  // Formularios: administradores, docentes, tecnicos, estudiantes (todos autenticados)
  const formulariosRoute = "/formularios"
  
  // Metas: público para todos (no requiere autenticación)
  const metasRoute = "/metas"
  
  // Admin routes
  const adminRoutes = ["/admin", "/gestion-usuarios"]

  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isReportesRoute = request.nextUrl.pathname.startsWith(reportesRoute)
  const isFormulariosRoute = request.nextUrl.pathname.startsWith(formulariosRoute)
  const isMetasRoute = request.nextUrl.pathname.startsWith(metasRoute)
  const isAdminRoute = adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Las metas son públicas - no requieren autenticación
  if (isMetasRoute) {
    return supabaseResponse
  }

  // Verificar autenticación para rutas que la requieren
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Si el usuario está autenticado, verificar roles específicos
  if (user) {
    // Obtener el perfil del usuario para verificar su rol
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const userRole = profile?.role as "admin" | "docente" | "tecnico" | "estudiante" | null

    // Verificar acceso a reportes (SOLO admin, docente, tecnico - NO estudiantes)
    if (isReportesRoute && userRole) {
      const allowedRoles = ["admin", "docente", "tecnico"]
      if (!allowedRoles.includes(userRole)) {
        const url = request.nextUrl.clone()
        url.pathname = "/acceso-denegado"
        return NextResponse.redirect(url)
      }
    }

    // Verificar acceso a formularios (todos los usuarios autenticados)
    if (isFormulariosRoute && !userRole) {
      const url = request.nextUrl.clone()
      url.pathname = "/acceso-denegado"
      return NextResponse.redirect(url)
    }

    // Verificar acceso a rutas de admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/acceso-denegado"
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from login
  if (request.nextUrl.pathname === "/login" && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
