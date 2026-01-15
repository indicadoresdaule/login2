"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import AccessDeniedAlert from "@/components/AccessDeniedAlert"

// Componente para usar searchParams de forma segura
function useSearchParamsWrapper() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearchParams(new URLSearchParams(window.location.search))
    }
  }, [])
  
  return searchParams
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showAccessDenied, setShowAccessDenied] = useState(false)
  const [accessDeniedReason, setAccessDeniedReason] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParamsWrapper()

  // Inicializar Supabase cliente
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Verificar acceso en el cliente
  useEffect(() => {
    const checkAccess = async () => {
      // Verificar si hay alerta de acceso denegado en localStorage
      const accessDenied = localStorage.getItem("access_denied")
      const accessDeniedReason = localStorage.getItem("access_denied_reason")
      
      if (accessDenied === "true" && accessDeniedReason) {
        setAccessDeniedReason(accessDeniedReason)
        setShowAccessDenied(true)
        localStorage.removeItem("access_denied")
        localStorage.removeItem("access_denied_reason")
      }

      // Verificar redirección desde login
      if (searchParams) {
        const redirectedFrom = searchParams.get("redirect")
        if (redirectedFrom) {
          // Limpiar el parámetro de la URL sin recargar
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete("redirect")
          window.history.replaceState({}, "", newUrl.toString())
        }
      }

      // Obtener rol del usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        
        setUserRole(profile?.role || null)
      } else {
        setUserRole(null)
      }

      // Verificar permisos según la ruta actual
      if (userRole) {
        // Rutas de reportes: solo admin, docente, tecnico
        if (pathname.startsWith("/reportes") && userRole === "estudiante") {
          setAccessDeniedReason("Los estudiantes no tienen acceso a los reportes")
          setShowAccessDenied(true)
          localStorage.setItem("access_denied", "true")
          localStorage.setItem("access_denied_reason", "Los estudiantes no tienen acceso a los reportes")
          router.replace("/")
          return
        }

        // Rutas de admin: solo admin
        if ((pathname.startsWith("/admin") || pathname.startsWith("/gestion-usuarios")) && userRole !== "admin") {
          setAccessDeniedReason("Solo los administradores pueden acceder a esta sección")
          setShowAccessDenied(true)
          localStorage.setItem("access_denied", "true")
          localStorage.setItem("access_denied_reason", "Solo los administradores pueden acceder a esta sección")
          router.replace("/")
          return
        }

        // Rutas de formularios: cualquier usuario autenticado (ya está cubierto)
        if (pathname.startsWith("/formularios") && !userRole) {
          setAccessDeniedReason("Debes iniciar sesión para acceder a los formularios")
          setShowAccessDenied(true)
          localStorage.setItem("access_denied", "true")
          localStorage.setItem("access_denied_reason", "Debes iniciar sesión para acceder a los formularios")
          router.replace("/login")
          return
        }
      } else {
        // Si no hay usuario pero la ruta requiere autenticación
        const authRequiredRoutes = [
          "/reportes",
          "/formularios",
          "/admin",
          "/gestion-usuarios",
          "/perfil",
          "/avances"
        ]
        
        const requiresAuth = authRequiredRoutes.some(route => pathname.startsWith(route))
        const isLoginPage = pathname === "/login"
        
        if (requiresAuth && !isLoginPage) {
          setAccessDeniedReason("Debes iniciar sesión para acceder a esta página")
          setShowAccessDenied(true)
          localStorage.setItem("access_denied", "true")
          localStorage.setItem("access_denied_reason", "Debes iniciar sesión para acceder a esta página")
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
          return
        }
      }
    }

    checkAccess()
  }, [pathname, router, searchParams, userRole, supabase])

  // Cerrar alerta
  const handleCloseAlert = () => {
    setShowAccessDenied(false)
    setAccessDeniedReason("")
  }

  return (
    <>
      {showAccessDenied && (
        <AccessDeniedAlert 
          message={accessDeniedReason}
          onClose={handleCloseAlert}
        />
      )}
      {children}
    </>
  )
}
