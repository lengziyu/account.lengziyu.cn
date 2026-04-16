"use client"

import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Plus, Settings } from "lucide-react"

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  // Do not rendering BottomNav on /items/new or /items/[id] natively, if users implement it selectively it's fine.
  // But if it's placed globally in layout, we can hide it conditionally:
  if (pathname.includes("/items/") || pathname === "/login" || pathname === "/register" || pathname === "/") return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] bg-white dark:bg-[#121316] border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] px-6 py-3 flex items-center justify-between z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      
      {/* Left Tab: Dashboard */}
      <button 
        onClick={() => router.push("/dashboard")}
        className={`flex flex-col items-center justify-center w-16 transition-colors ${pathname === "/dashboard" ? "text-brandIndigo" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
      >
        <LayoutDashboard className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-medium">概览</span>
      </button>

      {/* Center Tab: Floating Prominent Add Button */}
      <div className="relative w-16 flex justify-center">
        <button
          onClick={() => router.push("/items/new")}
          className="absolute -top-10 flex items-center justify-center w-14 h-14 bg-brandIndigo text-white rounded-full shadow-[0_8px_20px_rgba(168,85,247,0.35)] hover:scale-105 active:scale-95 transition-all outline-none"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Right Tab: Settings */}
      <button 
        onClick={() => router.push("/settings")}
        className={`flex flex-col items-center justify-center w-16 transition-colors ${pathname === "/settings" ? "text-brandIndigo" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
      >
        <Settings className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-medium">我的</span>
      </button>

    </div>
  )
}
