"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  fullName: string
  role: "super_admin" | "admin" | "user"
  assignedSteps: string[]
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Google Sheets configuration
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwTTD2lHyL8ADg0dvVUDXMDnolyy3466G0dH0es3TYWFsNRhYyYJQxYwsiK0_bmfkmQ/exec"
const SHEET_ID = "1Bxg2ryPzHKGMv9jeBtfEweaVJ-rsxIX_XO9dYF4D02Y"
const LOGIN_SHEET_NAME = "Login"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for saved user on component mount
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem("otp-user")
        const savedAuth = localStorage.getItem("otp-authenticated")

        if (savedUser && savedAuth === "true") {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        // Clear invalid data
        localStorage.removeItem("otp-user")
        localStorage.removeItem("otp-authenticated")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Replace the login function with this implementation that works with your existing Apps Script

// In the login function, update the user data parsing:
const login = async (username: string, password: string): Promise<boolean> => {
  try {
    setIsLoading(true)

    // Fetch users from Google Sheets
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${LOGIN_SHEET_NAME}`
    const response = await fetch(sheetUrl)
    const text = await response.text()

    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}") + 1
    const jsonData = text.substring(jsonStart, jsonEnd)

    const data = JSON.parse(jsonData)

    if (data && data.table && data.table.rows) {
      // Skip header row
      for (let i = 1; i < data.table.rows.length; i++) {
        const row = data.table.rows[i]

        if (row.c) {
          const rowUsername = row.c[0]?.v || ""
          const rowFullName = row.c[1]?.v || ""
          const rowPassword = row.c[2]?.v || ""
          const rowRole = row.c[3]?.v || "user"
          const rowAssignedSteps = row.c[4]?.v || ""

          // Check if username and password match
          if (rowUsername === username && rowPassword === password) {
            // Parse assigned steps from comma-separated string
            const assignedSteps = rowAssignedSteps.split(",").map((step: string) => step.trim())

            // Determine role - support super_admin, admin, user
            let userRole: "super_admin" | "admin" | "user" = "user"
            if (rowRole === "super_admin") userRole = "super_admin"
            else if (rowRole === "admin") userRole = "admin"

            const userData: User = {
              id: `user_${Date.now()}`,
              username: rowUsername,
              fullName: rowFullName,
              role: userRole,
              assignedSteps: assignedSteps.length > 0 ? assignedSteps : ["all"],
            }

            setUser(userData)
            setIsAuthenticated(true)
            localStorage.setItem("otp-user", JSON.stringify(userData))
            localStorage.setItem("otp-authenticated", "true")
            return true
          }
        }
      }
    }

    return false
  } catch (error) {
    console.error("Login error:", error)
    return false
  } finally {
    setIsLoading(false)
  }
}

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("otp-user")
    localStorage.removeItem("otp-authenticated")
    localStorage.removeItem("otp-orders")
    localStorage.removeItem("otp-cache")
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
