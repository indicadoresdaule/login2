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

  // Definir rutas
  const reportesRoute = "/reportes"
  const formulariosRoute = "/formularios"
  const metasRoute = "/metas"
  const adminRoutes = ["/admin", "/gestion-usuarios"]
  const authRoutes = ["/perfil", "/avances", ...adminRoutes]

  const isReportesRoute = request.nextUrl.pathname.startsWith(reportesRoute)
  const isFormulariosRoute = request.nextUrl.pathname.startsWith(formulariosRoute)
  const isMetasRoute = request.nextUrl.pathname.startsWith(metasRoute)
  const isAdminRoute = adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Las metas son públicas
  if (isMetasRoute) {
    return supabaseResponse
  }

  // Verificar acceso no autenticado
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    const alertHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Redirigiendo...</title></head>
        <body>
          <script>
            alert("⚠️ Debes iniciar sesión para acceder a esta página.")
            window.location.href = "/login?redirectedFrom=${encodeURIComponent(request.nextUrl.pathname)}"
          </script>
        </body>
      </html>
    `
    
    return new Response(alertHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Verificar roles si el usuario está autenticado
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const userRole = profile?.role as "admin" | "docente" | "tecnico" | "estudiante" | null

    // Verificar acceso a reportes (NO estudiantes)
    if (isReportesRoute && userRole) {
      const allowedRoles = ["admin", "docente", "tecnico"]
      if (!allowedRoles.includes(userRole)) {
        const alertHtml = `
          <!DOCTYPE html>
          <html>
            <head><title>Redirigiendo...</title></head>
            <body>
              <script>
                alert("🚫 Acceso denegado. Solo administradores, docentes y técnicos pueden ver reportes.")
                window.location.href = "/"
              </script>
            </body>
          </html>
        `
        
        return new Response(alertHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
    }

    // Verificar acceso a admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      const alertHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Redirigiendo...</title></head>
          <body>
            <script>
              alert("👑 Acceso restringido. Solo administradores pueden acceder.")
              window.location.href = "/"
            </script>
          </body>
        </html>
      `
      
      return new Response(alertHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }
  }

  // Usuario autenticado intentando acceder a login
  if (request.nextUrl.pathname === "/login" && user) {
    const alertHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Redirigiendo...</title></head>
        <body>
          <script>
            alert("✅ Ya has iniciado sesión.")
            window.location.href = "/"
          </script>
        </body>
      </html>
    `
    
    return new Response(alertHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return supabaseResponse
}
