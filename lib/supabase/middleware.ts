import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Función para crear una respuesta que solo muestra alerta
function createAlertOnlyResponse(message: string) {
  // Crear una respuesta con código 403 Forbidden
  // pero que solo muestre la alerta y no cargue la página
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Acceso Denegado</title>
        <script>
          // Mostrar alerta inmediatamente
          alert("${message.replace(/"/g, '\\"').replace(/'/g, "\\'")}");
          
          // Regresar a la página anterior
          window.history.back();
          
          // Prevenir cualquier acción adicional
          window.stop();
        </script>
      </head>
      <body>
        <div style="display: none;">Acceso denegado</div>
      </body>
    </html>
    `,
    {
      status: 403,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
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
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Obtener usuario actual
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

  // Las metas son públicas - no requieren autenticación
  if (isMetasRoute) {
    return supabaseResponse
  }

  // Verificar autenticación para rutas protegidas
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    return createAlertOnlyResponse(
      "⚠️ Acceso denegado\n\nDebes iniciar sesión para acceder a esta página.\n\nSerás redirigido a la página anterior."
    )
  }

  // Si el usuario está autenticado, verificar roles específicos
  if (user) {
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
        return createAlertOnlyResponse(
          "🚫 Acceso denegado\n\nSolo administradores, docentes y técnicos pueden acceder a los reportes.\n\nLos estudiantes no tienen acceso a esta sección."
        )
      }
    }

    // Verificar acceso a rutas de admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      return createAlertOnlyResponse(
        "👑 Acceso restringido\n\nEsta sección es exclusiva para administradores del sistema.\n\nNo tienes los permisos necesarios."
      )
    }

    // Verificar acceso a formularios (todos los usuarios autenticados)
    if (isFormulariosRoute && !userRole) {
      return createAlertOnlyResponse(
        "❌ Error de permisos\n\nNo se pudo verificar tu rol de usuario.\n\nPor favor, contacta al administrador."
      )
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
