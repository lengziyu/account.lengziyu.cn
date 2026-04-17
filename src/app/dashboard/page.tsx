"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { User, KeyRound, CheckCircle2, Fingerprint } from "lucide-react"

type IdentitySummary = {
  id: string
  name: string
  identifier: string
}

type ItemTag = {
  id: string
  tag: string
  type: "custom" | "system"
}

type VaultItem = {
  id: string
  title: string
  password?: string | null
  favorite: boolean
  createdAt?: string
  updatedAt?: string
  tags?: ItemTag[]
  identity?: IdentitySummary | null
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ""
  const d = new Date(dateString)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}号 ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

function getIdentityLabel(item: VaultItem) {
  if (!item.identity) return "未绑定主账号"
  return item.identity.name || item.identity.identifier
}

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<VaultItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      void fetchItems()
    }
  }, [status, search])

  const fetchItems = async () => {
    const res = await fetch(`/api/items?search=${encodeURIComponent(search)}`)
    if (!res.ok) return
    setItems(await res.json())
  }

  const copyToClipboard = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation()
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const favorites = items.filter((item) => item.favorite)

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { label: string; items: VaultItem[] }>()
    for (const item of items) {
      const key = item.identity?.id || "ungrouped"
      const label = getIdentityLabel(item)
      if (!groups.has(key)) groups.set(key, { label, items: [] })
      groups.get(key)!.items.push(item)
    }
    return Array.from(groups.values())
  }, [items])

  const renderItemCard = (item: VaultItem) => {
    const tags = item.tags || []
    return (
      <div
        key={item.id}
        className="group bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] hover:border-gray-200 dark:hover:bg-[rgba(255,255,255,0.05)] shadow-sm dark:shadow-none transition-all rounded-[12px] p-4 cursor-pointer flex flex-col justify-center relative overflow-hidden"
        onClick={() => router.push(`/items/${item.id}`)}
      >
        <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400 dark:text-textTertiary">
          {getIdentityLabel(item)}
        </div>
        <div className="flex justify-between items-start mb-2">
          <div className="text-[15px] font-[510] text-gray-900 dark:text-textPrimary truncate">{item.title}</div>
          <div className="flex items-center space-x-2 shrink-0 ml-3">
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

        <div className="flex flex-wrap gap-1 mt-2">
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

        <div className="mt-2 text-[11px] text-gray-400 dark:text-textTertiary">
          {(() => {
            const isUpdated =
              item.updatedAt &&
              item.createdAt &&
              new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000
            return isUpdated ? formatDate(item.updatedAt) : formatDate(item.createdAt)
          })()}
        </div>
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center transition-colors">
        <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center pt-5 md:pt-6 px-4 transition-colors">
      <div className="w-full max-w-[900px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brandIndigo to-accentHover flex items-center justify-center shadow-md shadow-brandIndigo/20">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-textPrimary drop-shadow-sm tracking-tight">
              主账号延展视图
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="搜索主账号、子账号、标签或备注..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[12px] px-4 py-3 text-[14px] font-[400] text-gray-900 dark:text-textPrimary placeholder-gray-400 dark:placeholder:text-textTertiary focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:border-transparent transition-all shadow-sm dark:shadow-none"
          />
        </div>

        {favorites.length > 0 && !search ? (
          <div className="mb-10">
            <h2 className="text-[14px] font-[510] text-gray-400 dark:text-textSecondary mb-4">收藏账号</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{favorites.map(renderItemCard)}</div>
          </div>
        ) : null}

        <div className="space-y-8">
          {groupedItems.map((group) => (
            <section key={group.label}>
              <h2 className="text-[14px] font-[510] text-gray-500 dark:text-textSecondary mb-4">
                {group.label} · {group.items.length} 条
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{group.items.map(renderItemCard)}</div>
            </section>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-[13px] text-gray-500 dark:text-textTertiary py-10 text-center bg-[rgba(255,255,255,0.5)] dark:bg-[rgba(255,255,255,0.01)] rounded-2xl border border-dashed border-gray-200 dark:border-[rgba(255,255,255,0.1)] mt-6">
            没有找到匹配记录。
          </div>
        ) : null}
      </div>
    </div>
  )
}
