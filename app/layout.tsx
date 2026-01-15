"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import AccessDeniedAlert from "@/components/AccessDeniedAlert"

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
  const searchParams = useSearchParams()

  // Inicializar Supabase cliente
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Verificar acceso en el cliente
  useEffect(() => {
    const checkAccess = async () => {
      // Verificar si hay alerta de acceso denegado en los headers
      const hasAccessDeniedHeader = document.cookie.includes("access_denied=true")
      
      if (hasAccessDeniedHeader) {
        // Limpiar la cookie
        document.cookie = "access_denied=; path=/; max-age=0"
        setAccessDeniedReason("No tienes permisos para acceder a esta página")
        setShowAccessDenied(true)
      }

      // Verificar redirección desde login
      const redirectedFrom = searchParams.get("redirectedFrom")
      if (redirectedFrom) {
        const newSearchParams = new URLSearchParams(searchParams.toString())
        newSearchParams.delete("redirectedFrom")
        router.replace(`${pathname}?${newSearchParams.toString()}`)
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
        if (pathname.startsWith("/reportes") && ["estudiante"].includes(userRole)) {
          setAccessDeniedReason("Los estudiantes no tienen acceso a los reportes")
          setShowAccessDenied(true)
          router.replace("/")
          return
        }

        // Rutas de admin: solo admin
        if ((pathname.startsWith("/admin") || pathname.startsWith("/gestion-usuarios")) && userRole !== "admin") {
          setAccessDeniedReason("Solo los administradores pueden acceder a esta sección")
          setShowAccessDenied(true)
          router.replace("/")
          return
        }

        // Rutas de formularios: cualquier usuario autenticado (ya está cubierto)
        if (pathname.startsWith("/formularios") && !userRole) {
          setAccessDeniedReason("Debes iniciar sesión para acceder a los formularios")
          setShowAccessDenied(true)
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
