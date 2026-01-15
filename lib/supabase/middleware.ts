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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Definir rutas y sus permisos
  const routes = {
    // Rutas públicas (no requieren autenticación)
    public: ["/", "/login", "/metas", "/acerca-de"],
    
    // Rutas que requieren autenticación pero cualquier rol
    authenticated: ["/perfil", "/avances", "/formularios"],
    
    // Rutas solo para admin, docente, tecnico (NO estudiantes)
    reportes: ["/reportes", "/reportes/"],
    
    // Rutas solo para administradores
    admin: ["/admin", "/admin/", "/gestion-usuarios"],
  }

  const currentPath = request.nextUrl.pathname

  // Verificar si la ruta es pública
  const isPublicRoute = routes.public.some(route => 
    currentPath === route || currentPath.startsWith(route + "/")
  )

  // Verificar si es ruta de reportes
  const isReportesRoute = routes.reportes.some(route => 
    currentPath.startsWith(route)
  )

  // Verificar si es ruta de admin
  const isAdminRoute = routes.admin.some(route => 
    currentPath.startsWith(route)
  )

  // Verificar si es ruta que requiere autenticación
  const isAuthenticatedRoute = routes.authenticated.some(route => 
    currentPath.startsWith(route)
  )

  // Si es ruta pública, permitir acceso
  if (isPublicRoute) {
    // Redirigir usuarios logueados desde login a home
    if (currentPath === "/login" && user) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Si requiere autenticación y no hay usuario, redirigir a login
  if ((isAuthenticatedRoute || isReportesRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", currentPath)
    return NextResponse.redirect(url)
  }

  // Si hay usuario, verificar permisos específicos
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const userRole = profile?.role

    // Verificar acceso a reportes (NO estudiantes)
    if (isReportesRoute) {
      const allowedRoles = ["admin", "docente", "tecnico"]
      if (!userRole || !allowedRoles.includes(userRole)) {
        // En lugar de redirigir, pasamos un header para mostrar alerta
        const response = NextResponse.redirect(new URL("/", request.url))
        response.headers.set("X-Access-Denied", "true")
        response.headers.set("X-Access-Denied-Reason", "Acceso restringido a estudiantes")
        return response
      }
    }

    // Verificar acceso a rutas de admin
    if (isAdminRoute && userRole !== "admin") {
      const response = NextResponse.redirect(new URL("/", request.url))
      response.headers.set("X-Access-Denied", "true")
      response.headers.set("X-Access-Denied-Reason", "Solo administradores pueden acceder")
      return response
    }
  }

  return supabaseResponse
}
