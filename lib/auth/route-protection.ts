import { NextResponse, type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export const ROUTE_CONFIG = {
  // Rutas que requieren autenticación y roles específicos
  protected: {
    "/gestion-usuarios": ["admin"],
    "/admin": ["admin"],
  },
  // Rutas públicas que no requieren autenticación
  public: ["/", "/login", "/registro", "/auth/callback"],
} as const

// Mensajes de error centralizados
const ERROR_MESSAGES = {
  unauthorized: "No tienes permisos para acceder a esta página",
  unauthenticated: "Debes iniciar sesión para acceder",
} as const

type UserRole = "admin" | "docente" | "tecnico" | "estudiante"

/**
 * Verifica si el usuario tiene acceso a la ruta solicitada
 * @param request - Request de Next.js
 * @param supabase - Cliente de Supabase
 * @returns NextResponse de redirección si no tiene acceso, null si tiene acceso
 */
export async function checkRouteAccess(request: NextRequest, supabase: SupabaseClient): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname

  // Verificar si es una ruta pública
  const isPublicRoute = ROUTE_CONFIG.public.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  if (isPublicRoute) {
    return null // Permitir acceso
  }

  // Verificar si es una ruta protegida por rol
  const protectedRoute = Object.entries(ROUTE_CONFIG.protected).find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (!protectedRoute) {
    return null // No es una ruta protegida, permitir acceso
  }

  const [, allowedRoles] = protectedRoute

  // Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Usuario no autenticado, redirigir a login
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("message", ERROR_MESSAGES.unauthenticated)
    redirectUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Obtener perfil del usuario para verificar rol
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single()

  if (!profile) {
    // Usuario sin perfil, redirigir al inicio
    const redirectUrl = new URL("/", request.url)
    redirectUrl.searchParams.set("message", ERROR_MESSAGES.unauthorized)
    return NextResponse.redirect(redirectUrl)
  }

  // Verificar si el rol del usuario está permitido
  const userRole = profile.role as UserRole
  const hasAccess = allowedRoles.includes(userRole)

  if (!hasAccess) {
    // Usuario sin permisos, redirigir a su perfil con mensaje
    const redirectUrl = new URL("/perfil", request.url)
    redirectUrl.searchParams.set("message", ERROR_MESSAGES.unauthorized)
    return NextResponse.redirect(redirectUrl)
  }

  return null // Usuario tiene acceso
}

/**
 * Obtiene los roles permitidos para una ruta específica
 */
export function getAllowedRolesForRoute(pathname: string): string[] | null {
  const route = Object.entries(ROUTE_CONFIG.protected).find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`),
  )
  return route ? route[1] : null
}

/**
 * Verifica si una ruta es pública
 */
export function isPublicRoute(pathname: string): boolean {
  return ROUTE_CONFIG.public.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
