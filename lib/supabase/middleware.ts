import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Función para crear una respuesta con script de alerta flotante
function createFloatingAlertResponse(message: string, isLoginAlert: boolean = false) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script>
          // Función para mostrar alerta flotante
          function showFloatingAlert(message, isLoginAlert) {
            // Crear elemento de alerta
            const alertDiv = document.createElement('div');
            alertDiv.id = 'floating-alert';
            alertDiv.innerHTML = \`
              <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                background: \${isLoginAlert ? '#e74c3c' : '#f39c12'};
                color: white;
                padding: 1rem;
                text-align: center;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span style="flex: 1; font-weight: 500;">\${message}</span>
                <div>
                  \${isLoginAlert ? 
                    '<button onclick="redirectToLogin()" style="background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 0.5rem 1rem; border-radius: 4px; margin-right: 1rem; cursor: pointer;">Iniciar sesión</button>' : 
                    ''
                  }
                  <button onclick="closeAlert()" style="background: rgba(0,0,0,0.2); border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">× Cerrar</button>
                </div>
              </div>
            \`;
            
            // Añadir al cuerpo
            document.body.appendChild(alertDiv);
            
            // Añadir padding al body para que el contenido no quede oculto
            document.body.style.paddingTop = '60px';
            
            // Mostrar alerta de navegador también
            setTimeout(() => alert(message), 100);
          }
          
          function redirectToLogin() {
            window.location.href = '/login?redirectedFrom=' + encodeURIComponent(window.location.pathname);
          }
          
          function closeAlert() {
            const alertDiv = document.getElementById('floating-alert');
            if (alertDiv) {
              alertDiv.remove();
              document.body.style.paddingTop = '';
            }
          }
          
          // Mostrar alerta cuando se cargue la página
          window.onload = function() {
            showFloatingAlert("${message.replace(/"/g, '\\"')}", ${isLoginAlert});
            
            // También redirigir automáticamente después de 5 segundos si es alerta de login
            if (${isLoginAlert}) {
              setTimeout(() => {
                if (document.getElementById('floating-alert')) {
                  redirectToLogin();
                }
              }, 5000);
            }
          };
        </script>
      </head>
      <body>
        <div style="padding: 2rem; text-align: center;">
          <div style="font-size: 5rem; margin-bottom: 1rem; color: #ccc;">🔒</div>
          <h1 style="color: #333;">${isLoginAlert ? 'Acceso restringido' : 'Acceso denegado'}</h1>
          <p style="color: #666;">${message}</p>
          <div style="margin-top: 2rem;">
            <button onclick="window.history.back()" style="background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin-right: 1rem;">
              Volver atrás
            </button>
            <button onclick="window.location.href='/'" style="background: #95a5a6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer;">
              Ir al inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return new Response(html, {
    status: isLoginAlert ? 401 : 403,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Definir rutas
  const reportesRoute = "/reportes";
  const formulariosRoute = "/formularios";
  const metasRoute = "/metas";
  const adminRoutes = ["/admin", "/gestion-usuarios"];
  
  // Rutas que requieren autenticación básica
  const authRoutes = ["/perfil", "/avances", ...adminRoutes];

  const isReportesRoute = request.nextUrl.pathname.startsWith(reportesRoute);
  const isFormulariosRoute = request.nextUrl.pathname.startsWith(formulariosRoute);
  const isMetasRoute = request.nextUrl.pathname.startsWith(metasRoute);
  const isAdminRoute = adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // Las metas son públicas - no requieren autenticación
  if (isMetasRoute) {
    return supabaseResponse;
  }

  // Verificar autenticación para rutas que la requieren
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    return createFloatingAlertResponse(
      "Debes iniciar sesión para acceder a esta página.",
      true
    );
  }

  // Si el usuario está autenticado, verificar roles específicos
  if (user) {
    // Obtener el perfil del usuario para verificar su rol
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role as "admin" | "docente" | "tecnico" | "estudiante" | null;

    // Verificar acceso a reportes (SOLO admin, docente, tecnico - NO estudiantes)
    if (isReportesRoute && userRole) {
      const allowedRoles = ["admin", "docente", "tecnico"];
      if (!allowedRoles.includes(userRole)) {
        return createFloatingAlertResponse(
          "Acceso denegado. Solo administradores, docentes y técnicos pueden acceder a los reportes.",
          false
        );
      }
    }

    // Verificar acceso a rutas de admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      return createFloatingAlertResponse(
        "Acceso denegado. Solo los administradores pueden acceder a esta sección.",
        false
      );
    }
  }

  // Redirect logged-in users away from login
  if (request.nextUrl.pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
