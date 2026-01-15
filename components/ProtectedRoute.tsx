// /components/ProtectedRoute.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserRole } from "@/lib/auth"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ("admin" | "docente" | "tecnico" | "estudiante")[]
  requireAuth?: boolean
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = false,
}: ProtectedRouteProps) {
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const userRole = await getUserRole()
      
      // Si requiere autenticación y no hay usuario
      if (requireAuth && !userRole) {
        router.push("/login")
        return
      }
      
      // Si hay roles específicos requeridos
      if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        router.push("/acceso-denegado")
        return
      }
    }

    checkAccess()
  }, [router, allowedRoles, requireAuth])

  return <>{children}</>
}
