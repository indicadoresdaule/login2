"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Mail, Calendar, UserIcon, Lock, SettingsIcon } from "lucide-react"
import Link from "next/link"

export default function ConfiguracionPage() {
  const router = useRouter()
  const { user, profile, loading } = useUser()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const getRoleName = (role: string | undefined) => {
    if (!role) return "Usuario"
    const roles: Record<string, string> = {
      admin: "Administrador",
      tecnico: "Técnico",
      normal: "Usuario",
    }
    return roles[role] || role
  }

  const getRoleBadgeColor = (role: string | undefined) => {
    if (!role) return "bg-gray-100 text-gray-700"
    const colors: Record<string, string> = {
      admin: "bg-purple-100 text-purple-700 border-purple-200",
      tecnico: "bg-blue-100 text-blue-700 border-blue-200",
      normal: "bg-gray-100 text-gray-700 border-gray-200",
    }
    return colors[role] || "bg-gray-100 text-gray-700 border-gray-200"
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden" })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres" })
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: "Contraseña actualizada exitosamente" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setMessage({ type: "error", text: data.error || "Error al actualizar la contraseña" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al actualizar la contraseña" })
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary-text">Cargando configuración...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-grow py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
            </div>
            <p className="text-secondary-text">Gestiona tu perfil y configuración de cuenta</p>
          </div>

          <div className="space-y-6">
            {/* Información del Perfil */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Información del Perfil
                </CardTitle>
                <CardDescription>Detalles de tu cuenta y rol en el sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile?.full_name && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-secondary-text">
                        <UserIcon className="w-4 h-4" />
                        Nombre Completo
                      </Label>
                      <div className="p-3 bg-secondary-bg rounded-lg">
                        <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-secondary-text">
                      <Mail className="w-4 h-4" />
                      Correo Electrónico
                    </Label>
                    <div className="p-3 bg-secondary-bg rounded-lg">
                      <p className="text-sm font-medium text-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-secondary-text">
                      <Shield className="w-4 h-4" />
                      Rol
                    </Label>
                    <div className="p-3 bg-secondary-bg rounded-lg">
                      <span
                        className={`inline-block text-sm font-medium px-3 py-1 rounded-md border ${getRoleBadgeColor(profile?.role)}`}
                      >
                        {getRoleName(profile?.role)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-secondary-text">
                      <Calendar className="w-4 h-4" />
                      Fecha de Registro
                    </Label>
                    <div className="p-3 bg-secondary-bg rounded-lg">
                      <p className="text-sm font-medium text-foreground">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "No disponible"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-secondary-text">
                      <UserIcon className="w-4 h-4" />
                      ID de Usuario
                    </Label>
                    <div className="p-3 bg-secondary-bg rounded-lg">
                      <p className="text-sm font-mono text-foreground truncate">{user.id}</p>
                    </div>
                  </div>
                </div>

                {profile?.role === "admin" && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Acceso Administrativo:</strong> Tienes permisos completos para gestionar usuarios y
                      configuraciones del sistema.
                    </p>
                    <Link href="/admin" className="inline-block mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-700 border-purple-300 hover:bg-purple-100 bg-transparent"
                      >
                        Ir al Panel de Administración
                      </Button>
                    </Link>
                  </div>
                )}

                {profile?.role === "tecnico" && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Acceso Técnico:</strong> Tienes permisos especiales para gestionar datos y reportes del
                      sistema.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cambiar Contraseña */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Cambiar Contraseña
                </CardTitle>
                <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña actual"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ingresa tu nueva contraseña"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirma tu nueva contraseña"
                      required
                      minLength={6}
                    />
                  </div>

                  {message && (
                    <div
                      className={`p-3 rounded-lg ${
                        message.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  )}

                  <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                    {isUpdating ? "Actualizando..." : "Actualizar Contraseña"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
