import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Función para crear una respuesta con alerta
function createAlertResponse(title: string, message: string, redirectUrl?: string, isLogin: boolean = false) {
  const safeMessage = message
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
  
  const safeTitle = title.replace(/"/g, '\\"').replace(/'/g, "\\'");
  
  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeTitle}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            color: #333;
          }
          
          .alert-container {
            background: white;
            border-radius: 16px;
            padding: 40px 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            text-align: center;
            animation: fadeIn 0.5s ease-out;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .alert-icon {
            font-size: 64px;
            margin-bottom: 20px;
            animation: bounce 1s infinite alternate;
          }
          
          @keyframes bounce {
            from {
              transform: translateY(0);
            }
            to {
              transform: translateY(-10px);
            }
          }
          
          .alert-title {
            color: ${isLogin ? '#e53e3e' : '#d69e2e'};
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 15px;
            line-height: 1.2;
          }
          
          .alert-message {
            color: #4a5568;
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          
          .alert-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .alert-button {
            padding: 14px 28px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 140px;
          }
          
          .alert-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
          }
          
          .alert-button-primary {
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white;
          }
          
          .alert-button-secondary {
            background: #e2e8f0;
            color: #4a5568;
          }
          
          .alert-button-secondary:hover {
            background: #cbd5e0;
          }
          
          .alert-button-success {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
          }
          
          .countdown {
            margin-top: 20px;
            color: #718096;
            font-size: 14px;
          }
          
          .countdown-number {
            font-weight: bold;
            color: ${isLogin ? '#e53e3e' : '#d69e2e'};
          }
        </style>
      </head>
      <body>
        <div class="alert-container">
          <div class="alert-icon">${isLogin ? '🔒' : '🚫'}</div>
          <h1 class="alert-title">${safeTitle}</h1>
          <p class="alert-message">${safeMessage}</p>
          
          <div class="alert-buttons">
            ${isLogin ? `
              <button class="alert-button alert-button-primary" onclick="window.location.href='/login?redirectedFrom=' + encodeURIComponent(window.location.pathname)">
                Iniciar Sesión
              </button>
            ` : ''}
            
            <button class="alert-button alert-button-secondary" onclick="window.history.back()">
              Volver Atrás
            </button>
            
            <button class="alert-button alert-button-success" onclick="window.location.href='/'">
              Ir al Inicio
            </button>
          </div>
          
          ${redirectUrl ? `
            <p class="countdown">
              Redireccionando en <span class="countdown-number" id="countdown">5</span> segundos...
            </p>
          ` : ''}
        </div>
        
        <script>
          // Mostrar alerta de navegador inmediatamente
          setTimeout(() => {
            alert("${safeTitle}\\n\\n${safeMessage}");
          }, 100);
          
          // Contador para redirección automática
          ${redirectUrl ? `
            let seconds = 5;
            const countdownElement = document.getElementById('countdown');
            const countdownInterval = setInterval(() => {
              seconds--;
              if (countdownElement) {
                countdownElement.textContent = seconds;
              }
              if (seconds <= 0) {
                clearInterval(countdownInterval);
                window.location.href = "${redirectUrl}";
              }
            }, 1000);
          ` : ''}
          
          // Si no hay redirección, después de 10 segundos ir al inicio
          ${!redirectUrl ? `
            setTimeout(() => {
              window.location.href = '/';
            }, 10000);
          ` : ''}
        </script>
      </body>
    </html>
  `;
  
  return new Response(html, {
    status: isLogin ? 401 : 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
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

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();

  // Definir rutas
  const reportesRoute = "/reportes";
  const formulariosRoute = "/formularios";
  const metasRoute = "/metas";
  const adminRoutes = ["/admin", "/gestion-usuarios"];
  const authRoutes = ["/perfil", "/avances", ...adminRoutes];

  const isReportesRoute = request.nextUrl.pathname.startsWith(reportesRoute);
  const isFormulariosRoute = request.nextUrl.pathname.startsWith(formulariosRoute);
  const isMetasRoute = request.nextUrl.pathname.startsWith(metasRoute);
  const isAdminRoute = adminRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // Las metas son públicas
  if (isMetasRoute) {
    return supabaseResponse;
  }

  // Verificar autenticación
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    return createAlertResponse(
      "Acceso Restringido",
      "Debes iniciar sesión para acceder a esta página. Serás redirigido automáticamente al inicio de sesión.",
      `/login?redirectedFrom=${encodeURIComponent(request.nextUrl.pathname)}`,
      true
    );
  }

  // Verificar roles si el usuario está autenticado
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role as "admin" | "docente" | "tecnico" | "estudiante" | null;

    // Verificar acceso a reportes (NO estudiantes)
    if (isReportesRoute && userRole) {
      const allowedRoles = ["admin", "docente", "tecnico"];
      if (!allowedRoles.includes(userRole)) {
        return createAlertResponse(
          "Acceso Denegado",
          "Solo administradores, docentes y técnicos pueden acceder a los reportes. Los estudiantes no tienen permiso para esta sección.",
          "/"
        );
      }
    }

    // Verificar acceso a rutas de admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      return createAlertResponse(
        "Acceso Exclusivo",
        "Esta sección es exclusiva para administradores del sistema. No tienes los permisos necesarios.",
        "/"
      );
    }

    // Verificar acceso a formularios (todos los usuarios autenticados)
    if (isFormulariosRoute && !userRole) {
      return createAlertResponse(
        "Error de Permisos",
        "No se pudo verificar tu rol de usuario. Por favor, contacta al administrador.",
        "/"
      );
    }
  }

  // Redirigir usuarios autenticados desde login
  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
