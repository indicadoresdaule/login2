import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Función para crear script que muestra alerta y redirige
function createAlertAndRedirectScript(message: string, redirectUrl: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script>
          // Mostrar alerta
          alert("${message.replace(/"/g, '\\"')}");
          
          // Redirigir después de cerrar la alerta
          window.location.href = "${redirectUrl}";
        </script>
      </head>
      <body>
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
          <div style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
            <p>Redirigiendo...</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return new Response(html, {
    status: 403,
    headers: { 'Content-Type': 'text/html' },
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
  const isAdminRoute = adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // Las metas son públicas
  if (isMetasRoute) {
    return supabaseResponse;
  }

  // Verificar autenticación
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    return createAlertAndRedirectScript(
      "Debes iniciar sesión para acceder a esta página.",
      `/login?redirectedFrom=${encodeURIComponent(request.nextUrl.pathname)}`
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
        return createAlertAndRedirectScript(
          "Solo administradores, docentes y técnicos pueden acceder a los reportes.",
          "/"
        );
      }
    }

    // Verificar acceso a admin (SOLO administradores)
    if (isAdminRoute && userRole !== "admin") {
      return createAlertAndRedirectScript(
        "Solo los administradores pueden acceder a esta sección.",
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
