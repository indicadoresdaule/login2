import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 })
    }

    const { email, password, full_name, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Email, contraseña y rol son requeridos" }, { status: 400 })
    }

    const { data: existingProfile } = await supabase.from("profiles").select("email").eq("email", email).single()

    if (existingProfile) {
      return NextResponse.json({ error: "Este correo ya está registrado" }, { status: 400 })
    }

    const adminClient = getAdminClient()

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || null,
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: newUser.user.id,
      email: newUser.user.email || email,
      full_name: full_name || null,
      role,
      status: "active",
    })

    if (profileError) {
      // Si falla la creación del perfil, eliminar el usuario
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Usuario creado correctamente",
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear usuario" }, { status: 500 })
  }
}
