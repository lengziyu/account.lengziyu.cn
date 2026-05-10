"use client"

import { usePathname, useRouter } from "next/navigation"
import { Bell, LayoutDashboard, Plus, Settings, WalletCards } from "lucide-react"

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const hideOnPaths = [
    /^\/items\/[^/]+$/,
    /^\/subscriptions\/new$/,
    /^\/subscriptions\/[^/]+$/,
    /^\/login$/,
    /^\/register$/,
    /^\/$/,
  ]

  if (hideOnPaths.some((pattern) => pattern.test(pathname))) return null

  const navItems = [
    {
      label: "概览",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "订阅",
      icon: WalletCards,
      href: "/subscriptions",
      active: pathname === "/subscriptions",
    },
    {
      label: "推送",
      icon: Bell,
      href: "/settings/notifications",
      active: pathname.startsWith("/settings/notifications"),
    },
    {
      label: "我的",
      icon: Settings,
      href: "/settings",
      active:
        pathname === "/settings" ||
        (pathname.startsWith("/settings/") && !pathname.startsWith("/settings/notifications")),
    },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 z-50 flex w-[calc(100%-1rem)] max-w-[900px] -translate-x-1/2 items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.08)] dark:bg-[#121316] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex w-16 flex-col items-center justify-center transition-colors ${item.active ? "text-brandIndigo" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
          >
            <Icon className="mb-1 h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        )
      })}

      <div className="relative flex w-16 justify-center">
        <button
          onClick={() => router.push("/items/new")}
          className="absolute -top-10 flex items-center justify-center w-14 h-14 bg-brandIndigo text-white rounded-full shadow-[0_8px_20px_rgba(168,85,247,0.35)] hover:scale-105 active:scale-95 transition-all outline-none"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {navItems.slice(2).map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex w-16 flex-col items-center justify-center transition-colors ${item.active ? "text-brandIndigo" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
          >
            <Icon className="mb-1 h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
