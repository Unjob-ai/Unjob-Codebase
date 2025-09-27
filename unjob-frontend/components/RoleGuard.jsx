"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function RoleGuard({ children, allowedRoles, redirectTo = "/dashboard" }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/login")
      return
    }

    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      router.push(redirectTo)
      return
    }
  }, [session, status, router, allowedRoles, redirectTo])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
      </div>
    )
  }

  if (!session || (allowedRoles && !allowedRoles.includes(session.user.role))) {
    return null
  }

  return children
}
