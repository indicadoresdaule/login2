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
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Definir rutas
  const reportesRoute = "/reportes"
  const formulariosRoute = "/formularios"
  const metasRoute = "/metas"
  const adminRoutes = ["/admin", "/gestion-usuarios"]
  const authRoutes = ["/perfil", "/avances", ...adminRoutes]

  const isReportesRoute = request.nextUrl.pathname.startsWith(reportesRoute)
  const isFormulariosRoute = request.nextUrl.pathname.startsWith(formulariosRoute)
  const isMetasRoute = request.nextUrl.pathname.startsWith(metasRoute)
  const isAdminRoute = adminRoutes.some(r => request.nextUrl.pathname.startsWith(r))
  const isAuthRoute = authRoutes.some(r => request.nextUrl.pathname.startsWith(r))

  // Página pública
  if (isMetasRoute) return supabaseResponse

  // Verificar acceso
  if ((isAuthRoute || isReportesRoute || isFormulariosRoute) && !user) {
    return new Response(
      `<script>alert("⚠️ Acceso denegado\\n\\nDebes iniciar sesión."); history.back();</script>`,
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const userRole = profile?.role as "admin" | "docente" | "tecnico" | "estudiante" | null

    // Reportes: NO estudiantes
    if (isReportesRoute && userRole && !["admin", "docente", "tecnico"].includes(userRole)) {
      return new Response(
        `<script>alert("🚫 Acceso denegado\\n\\nSolo administradores, docentes y técnicos pueden ver reportes."); window.location.href='/';</script>`,
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Admin: SOLO administradores
    if (isAdminRoute && userRole !== "admin") {
      return new Response(
        `<script>alert("👑 Acceso denegado\\n\\nSolo administradores pueden acceder aquí."); window.location.href='/';</script>`,
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      )
    }
  }

  // Redirigir desde login si ya está autenticado
  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return supabaseResponse
}
