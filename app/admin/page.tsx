"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UserPlus, Shield, Wrench, User, Trash2, Edit2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type UserRole = "admin" | "tecnico" | "normal"

interface UserProfile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

interface UserData {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  profile: UserProfile | null
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createFullName, setCreateFullName] = useState("")
  const [createRole, setCreateRole] = useState<UserRole>("normal")
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserData | null>(null)
  const [editRole, setEditRole] = useState<UserRole>("normal")
  const [editOpen, setEditOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    checkAuth()
    loadUsers()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/session")
      const data = await response.json()

      if (!data.user || !data.profile || data.profile.role !== "admin") {
        router.push("/")
        return
      }

      setCurrentUser(data)
    } catch (error) {
      router.push("/")
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createEmail || !createPassword) {
      setMessage({ type: "error", text: "Email y contraseña son requeridos" })
      return
    }

    setCreating(true)

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          full_name: createFullName,
          role: createRole,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: "Usuario creado correctamente" })
        setCreateEmail("")
        setCreatePassword("")
        setCreateFullName("")
        setCreateRole("normal")
        setCreateOpen(false)
        loadUsers()
      } else {
        setMessage({ type: "error", text: data.error || "Error al crear usuario" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error al crear usuario" })
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editUser) return

    try {
      const response = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: "Usuario actualizado correctamente" })
        setEditOpen(false)
        setEditUser(null)
        loadUsers()
      } else {
        setMessage({ type: "error", text: data.error || "Error al actualizar usuario" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error al actualizar usuario" })
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return

    try {
      const response = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: "Usuario eliminado correctamente" })
        setDeleteOpen(false)
        setDeleteUser(null)
        loadUsers()
      } else {
        setMessage({ type: "error", text: data.error || "Error al eliminar usuario" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error al eliminar usuario" })
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />
      case "tecnico":
        return <Wrench className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      admin: "bg-red-500/10 text-red-500 border-red-500/20",
      tecnico: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      normal: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    }

    return (
      <Badge variant="outline" className={colors[role]}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
            <p className="text-secondary-text mt-1">Gestiona usuarios y permisos del sistema</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg">
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>Registra un nuevo usuario en el sistema con sus credenciales</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">
                    Rol <span className="text-red-500">*</span>
                  </Label>
                  <Select value={createRole} onValueChange={(value) => setCreateRole(value as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span>Normal - Usuario estándar</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tecnico">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-blue-500" />
                          <span>Técnico - Permisos especiales</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span>Admin - Control total</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false)
                    setCreateEmail("")
                    setCreatePassword("")
                    setCreateFullName("")
                    setCreateRole("normal")
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={creating || !createEmail || !createPassword}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Crear Usuario
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-600"
                : "bg-red-500/10 border-red-500/20 text-red-600"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <p>{message.text}</p>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Usuario</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Rol</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Fecha de Registro</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Último Acceso</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.email}</p>
                          <p className="text-xs text-secondary-text">{user.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.profile ? getRoleBadge(user.profile.role) : <Badge>Sin perfil</Badge>}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-text">
                      {new Date(user.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-text">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("es-ES") : "Nunca"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditUser(user)
                            setEditRole(user.profile?.role || "normal")
                            setEditOpen(true)
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteUser(user)
                            setDeleteOpen(true)
                          }}
                          disabled={user.id === currentUser?.user?.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica el rol del usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <Input value={editUser?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta de{" "}
              <strong>{deleteUser?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar Usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
