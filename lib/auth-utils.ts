import { createBrowserClient } from "@supabase/ssr"

// Tipo para los roles
export type UserRole = "admin" | "docente" | "tecnico" | "estudiante"

// Función para obtener el rol del usuario actual
export async function getUserRole(): Promise<UserRole | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return profile?.role as UserRole | null
}

// Función para verificar si el usuario tiene un rol específico
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const role = await getUserRole()
  return role === requiredRole
}

// Función para verificar si el usuario tiene alguno de los roles permitidos
export async function hasAnyRole(allowedRoles: UserRole[]): Promise<boolean> {
  const role = await getUserRole()
  return role ? allowedRoles.includes(role) : false
}

// Función para verificar si el usuario es administrador
export async function isAdmin(): Promise<boolean> {
  return hasRole("admin")
}

// Función para verificar acceso a reportes (SOLO admin, docente, tecnico)
export async function canAccessReportes(): Promise<boolean> {
  return hasAnyRole(["admin", "docente", "tecnico"])
}

// Función para verificar acceso a formularios (todos los usuarios autenticados)
export async function canAccessFormularios(): Promise<boolean> {
  const role = await getUserRole()
  return role !== null // Cualquier usuario autenticado
}

// Función para verificar acceso público (metas)
export async function canAccessMetas(): Promise<boolean> {
  return true // Siempre accesible
}
