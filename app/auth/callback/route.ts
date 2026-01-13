import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      if (type === "invite") {
        const userMetadata = data.user.user_metadata
        const role = userMetadata?.role || "normal"

        // Verificar si ya existe el perfil
        const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", data.user.id).single()

        if (!existingProfile) {
          // Crear perfil con el rol asignado en la invitación
          await supabase.from("profiles").insert({
            id: data.user.id,
            email: data.user.email!,
            role: role,
            status: "active",
          })
        } else {
          // Actualizar el rol si el perfil ya existe
          await supabase
            .from("profiles")
            .update({
              role: role,
              status: "active",
            })
            .eq("id", data.user.id)
        }

        // Marcar la invitación como aceptada
        await supabase
          .from("user_invitations")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("email", data.user.email!)
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Si hay error, redirigir al login con mensaje de error
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
