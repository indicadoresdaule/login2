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
    // Crear página HTML con alerta y redirección
    const alertHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acceso denegado</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            .alert-container {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            .alert-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
              color: #e74c3c;
            }
            h1 {
              color: #2c3e50;
              margin-bottom: 1rem;
            }
            p {
              color: #7f8c8d;
              margin-bottom: 2rem;
            }
            .login-button {
              background: #3498db;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              font-size: 1rem;
              cursor: pointer;
              transition: background 0.3s;
            }
            .login-button:hover {
              background: #2980b9;
            }
            .back-button {
              background: #95a5a6;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              font-size: 1rem;
              cursor: pointer;
              margin-left: 1rem;
              transition: background 0.3s;
            }
            .back-button:hover {
              background: #7f8c8d;
            }
          </style>
          <script>
            function redirectToLogin() {
              window.location.href = '/login?redirectedFrom=${encodeURIComponent(request.nextUrl.pathname)}'
            }
            function goBack() {
              window.history.back()
            }
            // Mostrar alerta automática
            window.onload = function() {
              alert("Acceso restringido. Debes iniciar sesión para acceder a esta página.")
            }
          </script>
        </head>
        <body>
          <div class="alert-container">
            <div class="alert-icon">🔒</div>
            <h1>Acceso restringido</h1>
            <p>Debes iniciar sesión para acceder a esta página.</p>
            <div>
              <button class="login-button" onclick="redirectToLogin()">Iniciar sesión</button>
              <button class="back-button" onclick="goBack()">Volver</button>
            </div>
          </div>
        </body>
      </html>
    `

    return new Response(alertHtml, {
      status: 401,
      headers: {
        'Content-Type': 'text/html',
      },
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
            <head>
              <title>Acceso denegado</title>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                }
                .alert-container {
                  background: white;
                  padding: 2rem;
                  border-radius: 1rem;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                  text-align: center;
                  max-width: 400px;
                }
                .alert-icon {
                  font-size: 3rem;
                  margin-bottom: 1rem;
                  color: #e74c3c;
                }
                h1 {
                  color: #2c3e50;
                  margin-bottom: 1rem;
                }
                p {
                  color: #7f8c8d;
                  margin-bottom: 2rem;
                }
                .home-button {
                  background: #3498db;
                  color: white;
                  border: none;
                  padding: 0.75rem 1.5rem;
                  border-radius: 0.5rem;
                  font-size: 1rem;
                  cursor: pointer;
                  transition: background 0.3s;
                }
                .home-button:hover {
                  background: #2980b9;
                }
                .back-button {
                  background: #95a5a6;
                  color: white;
                  border: none;
                  padding: 0.75rem 1.5rem;
                  border-radius: 0.5rem;
                  font-size: 1rem;
                  cursor: pointer;
                  margin-left: 1rem;
                  transition: background 0.3s;
                }
                .back-button:hover {
                  background: #7f8c8d;
                }
              </style>
              <script>
                function goHome() {
                  window.location.href = '/'
                }
                function goBack() {
                  window.history.back()
                }
                // Mostrar alerta automática
                window.onload = function() {
                  alert("Acceso denegado. Solo administradores, docentes y técnicos pueden acceder a los reportes.")
                }
              </script>
            </head>
            <body>
              <div class="alert-container">
                <div class="alert-icon">🚫</div>
                <h1>Acceso denegado</h1>
                <p>Solo administradores, docentes y técnicos pueden acceder a los reportes.</p>
                <div>
                  <button class="home-button" onclick="goHome()">Ir al inicio</button>
                  <button class="back-button" onclick="goBack()">Volver</button>
                </div>
              </div>
            </body>
          </html>
        `

        return new Response(alertHtml, {
          status: 403,
          headers: {
            'Content-Type': 'text/html',
          },
        })
      }
    }

    // Verificar acceso a rutas de admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      const alertHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Acceso denegado</title>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              }
              .alert-container {
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .alert-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                color: #e74c3c;
              }
              h1 {
                color: #2c3e50;
                margin-bottom: 1rem;
              }
              p {
                color: #7f8c8d;
                margin-bottom: 2rem;
              }
              .home-button {
                background: #3498db;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.3s;
              }
              .home-button:hover {
                background: #2980b9;
              }
              .back-button {
                background: #95a5a6;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                margin-left: 1rem;
                transition: background 0.3s;
              }
              .back-button:hover {
                background: #7f8c8d;
              }
            </style>
            <script>
              function goHome() {
                window.location.href = '/'
              }
              function goBack() {
                window.history.back()
              }
              // Mostrar alerta automática
              window.onload = function() {
                alert("Acceso denegado. Solo los administradores pueden acceder a esta sección.")
              }
            </script>
          </head>
          <body>
            <div class="alert-container">
              <div class="alert-icon">👑</div>
              <h1>Acceso restringido</h1>
              <p>Solo los administradores pueden acceder a esta sección.</p>
              <div>
                <button class="home-button" onclick="goHome()">Ir al inicio</button>
                <button class="back-button" onclick="goBack()">Volver</button>
              </div>
            </div>
          </body>
        </html>
      `

      return new Response(alertHtml, {
        status: 403,
        headers: {
          'Content-Type': 'text/html',
        },
      })
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
