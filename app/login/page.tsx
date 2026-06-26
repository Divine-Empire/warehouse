"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If already authenticated, redirect to first accessible page
    if (!isLoading && isAuthenticated) {
      // Define menu items in the same order as sidebar
      const menuItems = [
        { href: "/dispatch", pageAccess: "Dispatch" },
        { href: "/transporting", pageAccess: "Transporting" },
        { href: "/packaging", pageAccess: "Packaging" },
        { href: "/bilty-upload", pageAccess: "Bilty Upload" },
        { href: "/purchase", pageAccess: "Purchase" },
        { href: "/ims", pageAccess: "IMS" },
        { href: "/PR_SR_DR_form", pageAccess: "PR_SR_DR Form" },
      ]

      // Get user's page access
      const savedUser = localStorage.getItem("otp-user")
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        const userPageAccess = userData.pageAccess || []
        const userRole = userData.role

        // Super admin and admin can access all pages - redirect to first page
        if (userRole === "admin" || userPageAccess.includes("all")) {
          router.push("/dispatch")
          return
        }

        // Find first accessible page
        const firstAccessiblePage = menuItems.find(item => 
          userPageAccess.includes(item.pageAccess)
        )

        if (firstAccessiblePage) {
          router.push(firstAccessiblePage.href)
        } else {
          // Default to dispatch if no specific access
          router.push("/dispatch")
        }
      } else {
        router.push("/dispatch")
      }
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const success = await login(username, password)
      if (success) {
        // Get the user data that was just saved
        const savedUser = localStorage.getItem("otp-user")
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          const userPageAccess = userData.pageAccess || []
          const userRole = userData.role

          // Define menu items in the same order as sidebar
          const menuItems = [
            { href: "/dispatch", pageAccess: "Dispatch" },
            { href: "/transporting", pageAccess: "Transporting" },
            { href: "/packaging", pageAccess: "Packaging" },
            { href: "/bilty-upload", pageAccess: "Bilty Upload" },
            { href: "/purchase", pageAccess: "Purchase" },
            { href: "/ims", pageAccess: "IMS" },
            { href: "/PR_SR_DR_form", pageAccess: "PR_SR_DR Form" },
          ]

          // Super admin and admin can access all pages - redirect to first page
          if (userRole === "admin" || userPageAccess.includes("all")) {
            router.push("/dispatch")
            return
          }

          // Find first accessible page
          const firstAccessiblePage = menuItems.find(item => 
            userPageAccess.includes(item.pageAccess)
          )

          if (firstAccessiblePage) {
            router.push(firstAccessiblePage.href)
          } else {
            router.push("/dispatch")
          }
        } else {
          router.push("/dispatch")
        }
      } else {
        setError("Invalid username or password")
      }
    } catch (error) {
      setError("An error occurred during login")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50/70 text-slate-800">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Verifying User...</p>
        </div>
      </div>
    )
  }

  // If already authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50/70 text-slate-800">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-emerald-600 mx-auto" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Welcome! Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/70 select-none overflow-hidden">
      {/* Background radial glow details */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[600px] w-[600px] rounded-full bg-blue-400/10 blur-[120px] animate-pulse duration-[8000ms]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-purple-400/10 blur-[120px] animate-pulse duration-[12000ms]" />
        <div className="absolute top-[35%] left-[25%] h-[400px] w-[400px] rounded-full bg-indigo-400/5 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-lg transition-all duration-300 hover:border-white/90">
          {/* Logo Section */}
          <div className="flex justify-center mb-6">
            <Image
              src="/divine-logo.svg"
              alt="Divine Logo"
              width={140}
              height={108}
              className="h-16 w-auto object-contain filter drop-shadow-[0_2px_12px_rgba(33,114,182,0.15)] transition-transform duration-500 hover:scale-105"
              priority
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Divine Empire
            </h1>
            <p className="mt-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
              Warehouse System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl focus:bg-white transition-all text-sm shadow-sm"
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl focus:bg-white transition-all text-sm shadow-sm"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 text-center animate-shake">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-md shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
