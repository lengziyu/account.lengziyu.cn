"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Skeleton } from "@/components/ui/Skeleton"
import { User, KeyRound, CheckCircle2, Fingerprint, BellRing } from "lucide-react"

type ItemTag = {
  id: string
  tag: string
  type: "custom" | "system"
}

type VaultItem = {
  id: string
  title: string
  displayTitle?: string | null
  password?: string | null
  favorite: boolean
  setAsMain?: boolean
  mainItemId?: string | null
  mainIdentityName?: string | null
  createdAt?: string
  updatedAt?: string
  tags?: ItemTag[]
}

type DueSubscription = {
  id: string
  platformName: string
  planName: string
  expiresAt: string
  daysUntilExpiry: number
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ""
  const d = new Date(dateString)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}号 ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

const ALL_TAG_FILTER = "全部"
const FAVORITES_TAG_FILTER = "收藏"

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<VaultItem[]>([])
  const [dueSubscriptions, setDueSubscriptions] = useState<DueSubscription[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState(ALL_TAG_FILTER)
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingDueSubscriptions, setLoadingDueSubscriptions] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const tag = params.get("tag")
    if (tag === FAVORITES_TAG_FILTER) {
      setActiveTag(FAVORITES_TAG_FILTER)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      void fetchItems()
    }
  }, [status, search])

  const fetchItems = async () => {
    setLoadingItems(true)
    const res = await fetch(`/api/items?search=${encodeURIComponent(search)}`)
    if (!res.ok) {
      setLoadingItems(false)
      return
    }
    setItems(await res.json())
    setLoadingItems(false)
  }

  const fetchDueSubscriptions = async () => {
    setLoadingDueSubscriptions(true)
    const res = await fetch("/api/subscriptions?dueWithin=7&limit=4")
    if (!res.ok) {
      setLoadingDueSubscriptions(false)
      return
    }
    const data = (await res.json()) as { items?: DueSubscription[] }
    setDueSubscriptions(data.items || [])
    setLoadingDueSubscriptions(false)
  }

  useEffect(() => {
    if (status === "authenticated") {
      void fetchDueSubscriptions()
    }
  }, [status])

  const copyToClipboard = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation()
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const topTags = useMemo(() => {
    const tagCounter = new Map<string, number>()
    for (const item of items) {
      const uniqueTags = new Set(
        (item.tags || [])
          .map((tag) => tag.tag.trim())
          .filter((tag) => tag.length > 0)
      )
      uniqueTags.forEach((tag) => {
        tagCounter.set(tag, (tagCounter.get(tag) || 0) + 1)
      })
    }

    return Array.from(tagCounter.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .slice(0, 3)
      .map(([tag]) => tag)
  }, [items])

  useEffect(() => {
    if (activeTag === ALL_TAG_FILTER || activeTag === FAVORITES_TAG_FILTER) return
    if (!topTags.includes(activeTag)) {
      setActiveTag(ALL_TAG_FILTER)
    }
  }, [topTags, activeTag])

  const filteredItems = useMemo(() => {
    if (activeTag === ALL_TAG_FILTER) return items
    if (activeTag === FAVORITES_TAG_FILTER) return items.filter((item) => item.favorite)
    return items.filter((item) => (item.tags || []).some((tag) => tag.tag === activeTag))
  }, [items, activeTag])

  const favorites = filteredItems.filter((item) => item.favorite)

  const filteredItemMap = useMemo(
    () => new Map(filteredItems.map((item) => [item.id, item])),
    [filteredItems]
  )

  const mainGroups = useMemo(() => {
    const childrenByMainId = new Map<string, VaultItem[]>()

    for (const item of filteredItems) {
      if (!item.mainItemId || !filteredItemMap.has(item.mainItemId)) continue
      const group = childrenByMainId.get(item.mainItemId) || []
      group.push(item)
      childrenByMainId.set(item.mainItemId, group)
    }

    return filteredItems
      .filter((item) => item.setAsMain)
      .map((main) => ({
        main,
        children: childrenByMainId.get(main.id) || [],
      }))
  }, [filteredItemMap, filteredItems])

  const groupedChildIds = useMemo(
    () => new Set(mainGroups.flatMap((group) => group.children.map((item) => item.id))),
    [mainGroups]
  )

  const standaloneItems = useMemo(
    () =>
      filteredItems.filter(
        (item) => !item.setAsMain && !groupedChildIds.has(item.id)
      ),
    [filteredItems, groupedChildIds]
  )

  const renderItemCard = (
    item: VaultItem,
    options?: { badge?: string }
  ) => {
    const tags = item.tags || []
    const badge =
      options?.badge ||
      (item.setAsMain
        ? "主账号"
        : item.mainIdentityName
          ? `归属 ${item.mainIdentityName}`
          : null)
    const badgeClassName =
      badge === "主账号"
        ? "bg-violet-700 text-white dark:bg-violet-600 dark:text-white"
        : badge === "子账号"
          ? "bg-violet-600 text-violet-50 dark:bg-violet-500 dark:text-violet-50"
          : "bg-brandIndigo/10 text-brandIndigo dark:bg-brandIndigo/20 dark:text-accentHover"
    const displayTime = (() => {
      const isUpdated =
        item.updatedAt &&
        item.createdAt &&
        new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000
      return isUpdated ? formatDate(item.updatedAt) : formatDate(item.createdAt)
    })()

    return (
      <div
        key={item.id}
        className="group bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] hover:border-gray-200 dark:hover:bg-[rgba(255,255,255,0.05)] shadow-sm dark:shadow-none transition-all rounded-xl p-3.5 cursor-pointer relative overflow-hidden"
        onClick={() => router.push(`/items/${item.id}`)}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {badge ? (
              <div className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeClassName}`}>
                {badge}
              </div>
            ) : null}
            <div className="text-[15px] font-[510] text-gray-900 dark:text-textPrimary truncate">{item.displayTitle || item.title}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 text-xs bg-brandIndigo/10 dark:bg-brandIndigo/20 text-brandIndigo dark:text-accentHover rounded"
                  >
                    {tag.tag}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-gray-500 dark:text-textTertiary">无标签</span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <div className="text-[11px] text-gray-400 dark:text-textTertiary whitespace-nowrap">{displayTime}</div>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={(e) => copyToClipboard(e, item.title, `account-${item.id}`)}
                className="flex items-center p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.15)] rounded-md text-gray-700 dark:text-gray-300 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.2)] shadow-sm"
                title="复制账号"
              >
                {copiedId === `account-${item.id}` ? (
                  <CheckCircle2 className="w-4 h-4 text-statusGreen" />
                ) : (
                  <User className="w-4 h-4 text-brandIndigo" />
                )}
              </button>

              {item.password ? (
                <button
                  type="button"
                  onClick={(e) => copyToClipboard(e, item.password || "", `pwd-${item.id}`)}
                  className="flex items-center p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.15)] rounded-md text-gray-700 dark:text-gray-300 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.2)] shadow-sm"
                  title="复制密码"
                >
                  {copiedId === `pwd-${item.id}` ? (
                    <CheckCircle2 className="w-4 h-4 text-statusGreen" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-brandIndigo" />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderMainGroup = (group: { main: VaultItem; children: VaultItem[] }) => {
    return (
      <div
        key={group.main.id}
        className="flex h-full flex-col rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">
              账号分组
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
              1 个主账号，{group.children.length} 个子账号
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {renderItemCard(group.main, { badge: "主账号" })}
          {group.children.map((item) => renderItemCard(item, { badge: "子账号" }))}
        </div>

        {group.children.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-[rgba(255,255,255,0.08)] dark:text-textTertiary">
            这个主账号下面暂时还没有挂子账号。
          </div>
        ) : null}

        {group.children.length > 0 && group.children.length % 2 === 0 ? (
          <div className="mt-3 text-xs text-gray-400 dark:text-textTertiary">
            大屏下已按两列排布主账号和子账号。
          </div>
        ) : null}
      </div>
    )
  }

  const renderStandaloneSection = () => {
    if (standaloneItems.length === 0) return null

    return (
      <div>
        <h2 className="text-[14px] font-[510] text-gray-500 dark:text-textSecondary mb-4">
          独立账号 · {standaloneItems.length} 条
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {standaloneItems.map((item) => renderItemCard(item))}
        </div>
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="w-full px-4 pt-5 md:pt-6 transition-colors">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-3 w-44 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="mb-5 h-12 w-full rounded-xl" />
          <div className="mb-6 rounded-xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          </div>
          <div className="mb-8 rounded-xl border border-orange-200/60 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-orange-400/15 dark:bg-white/5">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-64 rounded-lg" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[150px] w-full rounded-xl" />
            <Skeleton className="h-[150px] w-full rounded-xl" />
            <div className="grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-[112px] w-full rounded-xl" />
              <Skeleton className="h-[112px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center pt-5 md:pt-6 px-4 transition-colors">
      <div className="w-full max-w-[900px]">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brandIndigo to-accentHover flex items-center justify-center shadow-md shadow-brandIndigo/20">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-textPrimary drop-shadow-sm tracking-tight">
                len的密码库
              </h1>
              <p className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                {activeTag === FAVORITES_TAG_FILTER ? "当前高亮特别收藏。" : "主账号独立展示，子账号自动归在下面"}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="搜索账号、标签或备注..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[12px] px-4 py-3 text-[14px] font-[400] text-gray-900 dark:text-textPrimary placeholder-gray-400 dark:placeholder:text-textTertiary focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:border-transparent transition-all shadow-sm dark:shadow-none"
          />
        </div>

        <div className="sticky top-2 z-20 mb-5 rounded-xl border border-white/70 bg-[rgba(248,250,252,0.9)] px-3 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[rgba(19,24,36,0.84)]">
          <div className="flex flex-wrap gap-2">
          {[ALL_TAG_FILTER, ...topTags, FAVORITES_TAG_FILTER].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-brandIndigo border-brandIndigo text-white"
                  : "bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brandIndigo/50"
              }`}
            >
              {tag}
            </button>
          ))}
          </div>
        </div>

        {loadingDueSubscriptions ? (
          <div className="mb-8 rounded-xl border border-orange-200/60 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-orange-400/15 dark:bg-white/5">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-64 rounded-lg" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        ) : dueSubscriptions.length > 0 ? (
          <div className="mb-8 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm dark:border-orange-400/20 dark:from-orange-500/10 dark:to-[rgba(255,255,255,0.03)] dark:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-[11px] text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                  <BellRing className="w-3.5 h-3.5 mr-1.5" />
                  7 天内即将到期
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-textSecondary">
                  有 {dueSubscriptions.length} 条订阅进入提醒窗口，点击可直接处理。
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/subscriptions")}
                className="text-sm text-brandIndigo hover:text-accentHover transition-colors"
              >
                查看全部
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {dueSubscriptions.map((subscription) => (
                <button
                  key={subscription.id}
                  type="button"
                  onClick={() => router.push(`/subscriptions/${subscription.id}`)}
                  className="rounded-xl border border-orange-100 bg-white/90 px-4 py-3 text-left transition hover:border-orange-300 dark:border-orange-400/10 dark:bg-[rgba(255,255,255,0.04)]"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">
                    {subscription.platformName} / {subscription.planName}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                    {subscription.daysUntilExpiry <= 0
                      ? subscription.daysUntilExpiry === 0
                        ? "今天到期"
                        : `已过期 ${Math.abs(subscription.daysUntilExpiry)} 天`
                      : `还有 ${subscription.daysUntilExpiry} 天到期`}
                    {" · "}
                    {new Date(subscription.expiresAt).toLocaleDateString("zh-CN")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!loadingItems && favorites.length > 0 && !search ? (
          <div className="mb-10">
            <h2 className="text-[14px] font-[510] text-gray-400 dark:text-textSecondary mb-4">收藏账号</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((item) => renderItemCard(item))}
            </div>
          </div>
        ) : null}

        {loadingItems ? (
          <section>
            <div className="mb-8">
              <Skeleton className="h-5 w-28 rounded-lg" />
              <div className="mt-4 space-y-4">
                <Skeleton className="h-[220px] w-full rounded-xl" />
                <Skeleton className="h-[220px] w-full rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-lg" />
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Skeleton className="h-[120px] w-full rounded-xl" />
              <Skeleton className="h-[120px] w-full rounded-xl" />
            </div>
          </section>
        ) : filteredItems.length > 0 ? (
          <section>
            {mainGroups.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-[14px] font-[510] text-gray-500 dark:text-textSecondary mb-4">
                  主账号分组 · {mainGroups.length} 组
                </h2>
                <div className="space-y-4">
                  {mainGroups.map(renderMainGroup)}
                </div>
              </div>
            ) : null}

            {renderStandaloneSection()}
          </section>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-[rgba(255,255,255,0.5)] py-10 text-center text-[13px] text-gray-500 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.01)] dark:text-textTertiary">
            没有找到匹配记录。
          </div>
        )}
      </div>
    </div>
  )
}
