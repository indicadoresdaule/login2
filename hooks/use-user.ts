"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  last_sign_in_at: string | null
  created_at: string
  updated_at: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_user")
      return cached ? JSON.parse(cached) : null
    }
    return null
  })

  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_profile")
      return cached ? JSON.parse(cached) : null
    }
    return null
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const fetchUserAndProfile = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!isMounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          localStorage.setItem("cached_user", JSON.stringify(currentUser))
        } else {
          localStorage.removeItem("cached_user")
        }

        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profileError) throw profileError

          if (!isMounted) return

          setProfile(profileData)

          if (profileData) {
            localStorage.setItem("cached_profile", JSON.stringify(profileData))
          }
        } else {
          setProfile(null)
          localStorage.removeItem("cached_profile")
        }
      } catch (err) {
        if (!isMounted) return
        console.error("Error fetching user:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchUserAndProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        localStorage.setItem("cached_user", JSON.stringify(currentUser))
      } else {
        localStorage.removeItem("cached_user")
        localStorage.removeItem("cached_profile")
      }

      if (session?.user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        if (isMounted && profileData) {
          setProfile(profileData)
          localStorage.setItem("cached_profile", JSON.stringify(profileData))
        }
      } else {
        if (isMounted) {
          setProfile(null)
        }
      }

      if (isMounted) {
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, profile, loading, error }
}
