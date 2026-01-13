import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    // Check if user is admin
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

    const { id: userId } = await params

    // Prevent admin from suspending themselves
    if (userId === user.id) {
      return NextResponse.json({ error: "No puedes suspender tu propia cuenta" }, { status: 400 })
    }

    const { suspended } = await request.json()

    // Update user suspension status using admin client
    const adminClient = getAdminClient()
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: suspended ? "876000h" : "none", // 100 years or none
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: suspended ? "Usuario suspendido correctamente" : "Usuario reactivado correctamente",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar estado del usuario" }, { status: 500 })
  }
}
