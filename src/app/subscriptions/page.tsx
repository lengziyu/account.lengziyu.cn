"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Bell, CalendarClock, Plus } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/Skeleton"
import { SUBSCRIPTION_STATUS_OPTIONS } from "@/lib/subscription-options"

type SubscriptionItem = {
  id: string
  platformName: string
  planName: string
  status: string
  decision: string
  expiresAt: string
  autoRenew: boolean
  currency: string
  price?: number | null
  daysUntilExpiry: number
  isDueSoon: boolean
  vaultItem?: {
    id: string
    title: string
    displayTitle?: string | null
  } | null
}

type SubscriptionResponse = {
  items: SubscriptionItem[]
  summary: {
    total: number
    dueSoon: number
    expired: number
    autoRenew: number
  }
}

function formatCountdown(days: number) {
  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (days === 0) return "今天到期"
  return `还有 ${days} 天到期`
}

function deriveDaysUntilExpiry(expiresAt: string, fallback?: number) {
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback

  const target = new Date(expiresAt)
  if (Number.isNaN(target.getTime())) return 0

  const today = new Date()
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

  return Math.floor((targetDay - todayDay) / (24 * 60 * 60 * 1000))
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SubscriptionResponse | null>(null)
  const [error, setError] = useState("")
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    void fetchSubscriptions()
  }, [deferredSearch, status])

  const fetchSubscriptions = async () => {
    setLoading(true)
    setError("")
    const params = new URLSearchParams()
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim())
    if (status !== "all") params.set("status", status)

    try {
      const res = await fetch(`/api/subscriptions?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) {
        setError((await res.text()) || "订阅列表加载失败")
        setData(null)
        return
      }

      setData(await res.json())
    } catch {
      setError("订阅列表加载失败，请稍后重试")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const groups = useMemo(() => {
    const items = (data?.items || []).map((item) => ({
      ...item,
      daysUntilExpiry: deriveDaysUntilExpiry(item.expiresAt, item.daysUntilExpiry),
    }))
    return {
      dueSoon: items.filter((item) => item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 7),
      expired: items.filter((item) => item.daysUntilExpiry < 0),
      later: items.filter((item) => item.daysUntilExpiry > 7),
    }
  }, [data])

  return (
    <div className="min-h-screen bg-transparent transition-colors">
      <div className="mx-auto max-w-[900px] px-4 py-8 pb-28 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold tracking-tight text-gray-900 dark:text-textPrimary">订阅中心</h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
              统一看订阅、到期和提醒状态。
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
            <ThemeToggle />
            <Button
              type="button"
              variant="brand"
              onClick={() => router.push("/subscriptions/new")}
              className="min-h-10 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增订阅
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 dark:text-textSecondary">总订阅数</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-textPrimary">{data?.summary.total ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 dark:text-textSecondary">7 天内到期</div>
            <div className="mt-2 text-3xl font-semibold text-orange-600 dark:text-orange-300">{data?.summary.dueSoon ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 dark:text-textSecondary">已过期</div>
            <div className="mt-2 text-3xl font-semibold text-red-600 dark:text-red-300">{data?.summary.expired ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-500 dark:text-textSecondary">自动续费</div>
            <div className="mt-2 text-3xl font-semibold text-brandIndigo">{data?.summary.autoRenew ?? "-"}</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索平台、套餐、备注、关联账号"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 md:max-w-sm dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
            />
            <div className="flex flex-wrap gap-2">
              {[{ value: "all", label: "全部" }, ...SUBSCRIPTION_STATUS_OPTIONS].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`rounded-full px-3 py-2 text-xs transition-colors ${
                    status === option.value
                      ? "bg-brandIndigo text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-textSecondary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {[
            { label: "即将到期", icon: CalendarClock, items: groups.dueSoon },
            { label: "已过期", icon: Bell, items: groups.expired },
            { label: "后续到期", icon: ArrowRight, items: groups.later },
          ].map((section) => (
            <section key={section.label}>
              <div className="flex items-center gap-2 mb-3">
                <section.icon className="w-4 h-4 text-brandIndigo" />
                <h2 className="text-sm font-medium text-gray-600 dark:text-textSecondary">{section.label}</h2>
              </div>

              <div className="grid gap-3">
                {loading ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : section.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/70 bg-white/55 p-5 text-sm text-gray-500 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-textSecondary">
                    当前分组没有记录。
                  </div>
                ) : (
                  section.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(`/subscriptions/${item.id}`)}
                      className="rounded-xl border border-white/70 bg-white/75 p-5 text-left shadow-sm backdrop-blur transition hover:border-brandIndigo/30 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-gray-900 dark:text-textPrimary">
                              {item.platformName}
                            </div>
                            {item.planName ? (
                              <span className="rounded-full bg-brandIndigo/10 px-2.5 py-1 text-[11px] text-brandIndigo dark:bg-brandIndigo/20 dark:text-white">
                                {item.planName}
                              </span>
                            ) : null}
                            {item.autoRenew ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                自动续费
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 text-sm text-gray-500 dark:text-textSecondary">
                            {formatCountdown(item.daysUntilExpiry)}
                            {item.vaultItem
                              ? ` · 关联账号：${item.vaultItem.displayTitle || item.vaultItem.title}`
                              : ""}
                          </div>
                        </div>

                        <div className="shrink-0 text-sm text-gray-500 dark:text-textSecondary">
                          {new Date(item.expiresAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
