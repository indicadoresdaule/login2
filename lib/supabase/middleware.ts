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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
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

  // Reportes: solo administradores, docentes, tecnicos (NO estudiantes)
  const reportesRoute = "/reportes"

  // Formularios: administradores, docentes, tecnicos, estudiantes (todos los usuarios autenticados)
  const formulariosRoute = "/formularios"

  // Admin routes
  const adminRoutes = ["/admin", "/gestion-usuarios"]

  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isReportesRoute = request.nextUrl.pathname.startsWith(reportesRoute)
  const isFormulariosRoute = request.nextUrl.pathname.startsWith(formulariosRoute)
  const isAdminRoute = adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Verificar autenticación básica
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Si el usuario está autenticado, verificar roles específicos
  if (user) {
    // Obtener el perfil del usuario para verificar su rol
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    // Verificar acceso a reportes (solo administradores, docentes, tecnicos)
    if (isReportesRoute && profile) {
      const allowedRoles = ["admin", "docente", "tecnico", "estudiante"]
      if (!allowedRoles.includes(profile.role)) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
    }

    // Verificar acceso a rutas de admin (solo administradores)
    if (isAdminRoute && profile) {
      if (profile.role !== "admin") {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
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
