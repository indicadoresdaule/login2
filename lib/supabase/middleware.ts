import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Función para crear una respuesta que muestra alerta y luego redirige
function createAlertAndRedirectResponse(message: string, redirectPath: string = "/") {
  const safeMessage = message
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')

  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Redireccionando...</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f8f9fa;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
          }
          .loading {
            color: #6c757d;
            font-size: 16px;
          }
        </style>
        <script>
          // Mostrar alerta
          setTimeout(() => {
            alert("${safeMessage}");
            // Redirigir después de cerrar la alerta
            window.location.href = "${redirectPath}";
          }, 100);
        </script>
      </head>
      <body>
        <div class="loading">Procesando acceso...</div>
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

  // Las metas son públicas
  if (isMetasRoute) {
    return supabaseResponse
  }

  // Verificar autenticación
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    return createAlertAndRedirectResponse(
      "🔒 Acceso restringido\n\nDebes iniciar sesión para acceder a esta página.",
      `/login?redirectedFrom=${encodeURIComponent(request.nextUrl.pathname)}`
    )
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
        return createAlertAndRedirectResponse(
          "📊 Acceso denegado\n\nSolo administradores, docentes y técnicos pueden acceder a los reportes.\n\nLos estudiantes no tienen acceso a esta sección.",
          "/"
        )
      }
    }

    // Verificar acceso a admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      return createAlertAndRedirectResponse(
        "👑 Acceso exclusivo\n\nEsta sección es solo para administradores del sistema.",
        "/"
      )
    }

    // Verificar acceso a formularios
    if (isFormulariosRoute && !userRole) {
      return createAlertAndRedirectResponse(
        "⚠️ Error de permisos\n\nNo se pudo verificar tu rol de usuario.",
        "/"
      )
    }
  }

  // Redirigir usuarios autenticados desde login
  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return supabaseResponse
}
