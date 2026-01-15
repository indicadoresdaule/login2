import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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

  // Para rutas protegidas, si no hay usuario, DENEGAR acceso con alerta
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    // Crear una respuesta que solo muestre alerta
    const alertHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acceso Denegado</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Arial, sans-serif;
              background: #f0f0f0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .message {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 5px 15px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
          </style>
        </head>
        <body>
          <div class="message">
            <h2>🔒 Acceso Denegado</h2>
            <p>No tienes permiso para ver esta página.</p>
            <p>La alerta se mostró automáticamente.</p>
          </div>
          <script>
            // Mostrar alerta inmediatamente
            alert("⚠️ Acceso denegado. Debes iniciar sesión para acceder a esta página.");
            
            // Esperar 2 segundos y luego redirigir al login
            setTimeout(() => {
              window.location.href = '/login?redirectedFrom=${encodeURIComponent(request.nextUrl.pathname)}';
            }, 2000);
          </script>
        </body>
      </html>
    `;
    
    return new Response(alertHtml, {
      status: 401,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Si el usuario está autenticado, verificar roles específicos
  if (user) {
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
        const alertHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Acceso Denegado</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 0; 
                  font-family: Arial, sans-serif;
                  background: #f0f0f0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                .message {
                  background: white;
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                  text-align: center;
                  max-width: 500px;
                }
              </style>
            </head>
            <body>
              <div class="message">
                <h2>🚫 Acceso Restringido</h2>
                <p>Solo administradores, docentes y técnicos pueden ver reportes.</p>
                <p>Los estudiantes no tienen acceso a esta sección.</p>
              </div>
              <script>
                // Mostrar alerta
                alert("⚠️ Acceso denegado. Solo administradores, docentes y técnicos pueden acceder a los reportes.");
                
                // Redirigir a inicio después de 2 segundos
                setTimeout(() => {
                  window.location.href = '/';
                }, 2000);
              </script>
            </body>
          </html>
        `;
        
        return new Response(alertHtml, {
          status: 403,
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    // Verificar acceso a rutas de admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      const alertHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Acceso Denegado</title>
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                font-family: Arial, sans-serif;
                background: #f0f0f0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .message {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
            </style>
          </head>
          <body>
            <div class="message">
              <h2>👑 Acceso Exclusivo</h2>
              <p>Esta sección es solo para administradores del sistema.</p>
            </div>
            <script>
              // Mostrar alerta
              alert("⚠️ Acceso denegado. Solo los administradores pueden acceder a esta sección.");
              
              // Redirigir a inicio después de 2 segundos
              setTimeout(() => {
                window.location.href = '/';
              }, 2000);
            </script>
          </body>
        </html>
      `;
      
      return new Response(alertHtml, {
        status: 403,
        headers: { 'Content-Type': 'text/html' },
      });
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
