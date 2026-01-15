import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Función para modificar la respuesta HTML e inyectar script de alerta
async function injectAlertScript(response: Response, message: string, redirectUrl: string) {
  const html = await response.text()
  
  // Crear script que se ejecutará al cargar la página
  const alertScript = `
    <script>
      // Mostrar alerta inmediatamente
      alert("${message.replace(/"/g, '\\"')}");
      
      // Redirigir después de cerrar la alerta
      window.location.href = "${redirectUrl}";
    </script>
  `
  
  // Insertar el script justo antes del cierre de </body>
  const modifiedHtml = html.replace('</body>', `${alertScript}</body>`)
  
  return new Response(modifiedHtml, {
    status: response.status,
    headers: response.headers,
  })
}

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

  // Definir rutas
  const reportesRoute = "/reportes"
  const formulariosRoute = "/formularios"
  const metasRoute = "/metas"
  const adminRoutes = ["/admin", "/gestion-usuarios"]
  
  // Rutas que requieren autenticación básica
  const authRoutes = ["/perfil", "/avances", ...adminRoutes]

  const isReportesRoute = request.nextUrl.pathname.startsWith(reportesRoute)
  const isFormulariosRoute = request.nextUrl.pathname.startsWith(formulariosRoute)
  const isMetasRoute = request.nextUrl.pathname.startsWith(metasRoute)
  const isAdminRoute = adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Las metas son públicas - no requieren autenticación
  if (isMetasRoute) {
    return supabaseResponse
  }

  // Verificar autenticación para rutas que la requieren
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    // Redirigir al login pero primero mostrar alerta
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname)
    
    // Modificar la respuesta para mostrar alerta antes de redirigir
    const redirectResponse = NextResponse.redirect(url)
    
    // Devolver una página temporal que solo muestra la alerta y redirige
    const alertHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Redirigiendo...</title></head>
        <body>
          <script>
            alert("Debes iniciar sesión para acceder a esta página.")
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
        const alertHtml = `
          <!DOCTYPE html>
          <html>
            <head><title>Redirigiendo...</title></head>
            <body>
              <script>
                alert("Acceso denegado. Solo administradores, docentes y técnicos pueden acceder a los reportes.")
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

    // Verificar acceso a rutas de admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      const alertHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Redirigiendo...</title></head>
          <body>
            <script>
              alert("Acceso denegado. Solo los administradores pueden acceder a esta sección.")
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

  // Redirect logged-in users away from login
  if (request.nextUrl.pathname === "/login" && user) {
    const alertHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Redirigiendo...</title></head>
        <body>
          <script>
            alert("Ya has iniciado sesión.")
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
