"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { ArrowLeft, Plus, X, Trash2, CheckCircle2, Copy } from "lucide-react"

type Category = { id: string; name: string }
type Identity = {
  id: string
  name: string
  identifier: string
  kind: string
  provider?: string | null
}
type ItemTag = { id: string; tag: string; type: "custom" | "system" }
type ItemDetail = {
  id: string
  identityId?: string | null
  serviceName?: string | null
  serviceDomain?: string | null
  loginValue?: string | null
  title: string
  password?: string | null
  category?: string | null
  notes?: string | null
  favorite: boolean
  createdAt?: string
  updatedAt?: string
  tags: ItemTag[]
}

type TagResponse = {
  custom: string[]
  sections: { label: string; tags: string[] }[]
  suggested: string[]
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ""
  const d = new Date(dateString)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}号 ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

export default function ItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [identities, setIdentities] = useState<Identity[]>([])
  const [tagSections, setTagSections] = useState<{ label: string; tags: string[] }[]>([])

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingIdentity, setIsAddingIdentity] = useState(false)
  const [newIdentityValue, setNewIdentityValue] = useState("")
  const [newIdentityName, setNewIdentityName] = useState("")

  const [tagInput, setTagInput] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [systemTags, setSystemTags] = useState<string[]>([])

  const [timestamps, setTimestamps] = useState({ createdAt: "", updatedAt: "" })
  const [formData, setFormData] = useState({
    identityId: "",
    serviceName: "",
    serviceDomain: "",
    loginValue: "",
    title: "",
    password: "",
    category: "other",
    notes: "",
    favorite: false,
  })

  useEffect(() => {
    void Promise.all([fetchCategories(), fetchIdentities(), fetchTags(), fetchItem()])
  }, [id])

  const fetchCategories = async () => {
    const res = await fetch("/api/categories")
    if (!res.ok) return
    setCategories(await res.json())
  }

  const fetchIdentities = async () => {
    const res = await fetch("/api/identities")
    if (!res.ok) return
    setIdentities(await res.json())
  }

  const fetchTags = async () => {
    const res = await fetch("/api/tags")
    if (!res.ok) return
    const data = (await res.json()) as TagResponse
    setTagSections(data.sections || [])
  }

  const fetchItem = async () => {
    const res = await fetch(`/api/items/${id}`)
    if (!res.ok) {
      setError("无法加载记录")
      setLoading(false)
      return
    }

    const data = (await res.json()) as ItemDetail
    setFormData({
      identityId: data.identityId || "",
      serviceName: data.serviceName || "",
      serviceDomain: data.serviceDomain || "",
      loginValue: data.loginValue || "",
      title: data.title || "",
      password: data.password || "",
      category: data.category || "other",
      notes: data.notes || "",
      favorite: !!data.favorite,
    })
    setSelectedTags(data.tags.filter((tag) => tag.type === "custom").map((tag) => tag.tag))
    setSystemTags(data.tags.filter((tag) => tag.type === "system").map((tag) => tag.tag))
    setTimestamps({
      createdAt: data.createdAt || "",
      updatedAt: data.updatedAt || "",
    })
    setLoading(false)
  }

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const addTag = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    const exists = selectedTags.some((tag) => tag.toLowerCase() === value.toLowerCase())
    if (exists) return
    setSelectedTags((prev) => [...prev, value])
  }

  const removeTag = (value: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== value))
  }

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    addTag(tagInput)
    setTagInput("")
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      setError(await res.text())
      return
    }
    const created = await res.json()
    setCategories((prev) => [...prev, created])
    setFormData((prev) => ({ ...prev, category: created.name }))
    setNewCategoryName("")
    setIsAddingCategory(false)
  }

  const handleAddIdentity = async () => {
    const identifier = newIdentityValue.trim()
    if (!identifier) return

    const res = await fetch("/api/identities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        name: newIdentityName.trim() || identifier,
        kind: identifier.includes("@") ? "email" : "username",
      }),
    })
    if (!res.ok) {
      setError(await res.text())
      return
    }
    const created = await res.json()
    setIdentities((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
    setFormData((prev) => ({
      ...prev,
      identityId: created.id,
      loginValue: prev.loginValue || created.identifier,
    }))
    setNewIdentityName("")
    setNewIdentityValue("")
    setIsAddingIdentity(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          identityId: formData.identityId || null,
          tags: selectedTags,
        }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("确定要删除这条记录吗？")) return
    setSaving(true)
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" })
    if (!res.ok) {
      setSaving(false)
      setError("删除失败")
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopyStatus(key)
    setTimeout(() => setCopyStatus(null), 1500)
  }

  const categoryOptions = [
    { value: "social", label: "社交 (Social)" },
    { value: "website", label: "网站 (Website)" },
    { value: "device", label: "设备 (Device)" },
    { value: "dev", label: "开发 (Dev)" },
    { value: "finance", label: "金融 (Finance)" },
    { value: "other", label: "其他 (Other)" },
    ...categories
      .filter((item) => !["social", "website", "device", "dev", "finance", "other"].includes(item.name))
      .map((item) => ({ value: item.name, label: item.name })),
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack flex items-center justify-center transition-colors">
        <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack flex flex-col p-4 sm:p-8 transition-colors">
      <div className="max-w-2xl w-full mx-auto bg-white dark:bg-[rgba(255,255,255,0.02)] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-[rgba(255,255,255,0.08)] p-6 sm:p-8">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-textPrimary">编辑子账号</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(formData.loginValue || formData.title, "account")}
              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700"
            >
              {copyStatus === "account" ? <CheckCircle2 className="w-4 h-4" /> : "复制登录值"}
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(formData.password, "password")}
              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700"
            >
              {copyStatus === "password" ? <CheckCircle2 className="w-4 h-4" /> : "复制密码"}
            </button>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `主账号: ${formData.identityId || "未绑定"}\n站点: ${formData.serviceName}\n域名: ${formData.serviceDomain}\n登录值: ${formData.loginValue}\n账号: ${formData.title}\n密码: ${formData.password}`,
                  "all"
                )
              }
              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700"
            >
              {copyStatus === "all" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-textSecondary">主账号（Identity）</label>
              <button type="button" onClick={() => setIsAddingIdentity((prev) => !prev)} className="text-xs text-brandIndigo inline-flex items-center">
                <Plus className="w-3 h-3 mr-1" />
                新主账号
              </button>
            </div>
            {isAddingIdentity ? (
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newIdentityValue}
                  onChange={(e) => setNewIdentityValue(e.target.value)}
                  placeholder="主标识，如 1058@qq.com"
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIdentityName}
                    onChange={(e) => setNewIdentityName(e.target.value)}
                    placeholder="显示名(可选)"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
                  />
                  <Button type="button" variant="brand" onClick={handleAddIdentity}>
                    保存
                  </Button>
                </div>
              </div>
            ) : null}
            <select
              value={formData.identityId}
              onChange={(e) => handleChange("identityId", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
            >
              <option value="">不绑定主账号</option>
              {identities.map((identity) => (
                <option key={identity.id} value={identity.id}>
                  {identity.name} · {identity.identifier}
                </option>
              ))}
            </select>
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">站点名称</label>
              <input
                value={formData.serviceName}
                onChange={(e) => handleChange("serviceName", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">站点域名</label>
              <input
                value={formData.serviceDomain}
                onChange={(e) => handleChange("serviceDomain", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">登录值</label>
              <input
                value={formData.loginValue}
                onChange={(e) => handleChange("loginValue", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-textSecondary">分类</label>
                <button type="button" onClick={() => setIsAddingCategory((prev) => !prev)} className="text-xs text-brandIndigo inline-flex items-center">
                  <Plus className="w-3 h-3 mr-1" />
                  新分类
                </button>
              </div>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
                  />
                  <Button type="button" variant="brand" onClick={handleAddCategory}>
                    添加
                  </Button>
                </div>
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">账号标题 *</label>
              <input
                required
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">密码</label>
              <input
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
              />
            </div>
          </section>

          <section className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary">自定义标签</label>
            {tagSections.map((section) => (
              <div key={section.label}>
                <p className="text-xs text-gray-500 mb-1">{section.label}</p>
                <div className="flex flex-wrap gap-2">
                  {section.tags.map((tag) => (
                    <button
                      key={`${section.label}-${tag}`}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="px-2 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-700"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span key={tag} className="flex items-center px-2 py-1 bg-brandIndigo/10 text-brandIndigo rounded">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInput}
                placeholder="输入标签后回车"
                className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.02)]"
              />
            </div>
            {systemTags.length > 0 ? (
              <div className="text-xs text-gray-500 dark:text-textTertiary">
                系统标签：{systemTags.join("、")}
              </div>
            ) : null}
          </section>

          <section>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">备注</label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]"
            />
          </section>

          <div className="text-center text-[11px] text-gray-400 dark:text-textTertiary">
            创建于: {formatDate(timestamps.createdAt)}
            {timestamps.updatedAt && timestamps.createdAt && new Date(timestamps.updatedAt).getTime() - new Date(timestamps.createdAt).getTime() > 1000
              ? ` · 更新于: ${formatDate(timestamps.updatedAt)}`
              : ""}
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors flex items-center text-sm font-medium"
              disabled={saving}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                取消
              </Button>
              <Button type="submit" disabled={saving} variant="brand">
                {saving ? "保存中..." : "保存修改"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
