"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { SelectMenu } from "@/components/ui/SelectMenu"
import { ArrowLeft, Plus, Trash2, CheckCircle2, Copy, Check } from "lucide-react"

type Category = { id: string; name: string }
type Identity = { id: string; name: string; identifier: string; notes?: string | null }
type ItemTag = { id: string; tag: string; type: "custom" | "system" }
type ItemDetail = {
  id: string
  identityId?: string | null
  phoneIdentityId?: string | null
  setAsMain?: boolean
  title: string
  displayTitle?: string | null
  password?: string | null
  category?: string | null
  notes?: string | null
  favorite: boolean
  createdAt?: string
  updatedAt?: string
  tags: ItemTag[]
}
type TagResponse = { sections: { label: string; tags: string[] }[] }

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
  const [phones, setPhones] = useState<Identity[]>([])
  const [siteTags, setSiteTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [bindIdentity, setBindIdentity] = useState(false)
  const [setAsMain, setSetAsMain] = useState(false)
  const [newTagName, setNewTagName] = useState("")

  const [timestamps, setTimestamps] = useState({ createdAt: "", updatedAt: "" })
  const [formData, setFormData] = useState({
    identityId: "",
    phoneIdentityId: "",
    title: "",
    displayTitle: "",
    password: "",
    category: "other",
    notes: "",
    favorite: false,
  })

  useEffect(() => {
    void Promise.all([fetchCategories(), fetchIdentities(), fetchPhones(), fetchTags(), fetchItem()])
  }, [id])

  useEffect(() => {
    if (selectedTags.length === 0) return
    setSiteTags((prev) => Array.from(new Set([...prev, ...selectedTags])))
  }, [selectedTags])

  const fetchCategories = async () => {
    const res = await fetch("/api/categories")
    if (!res.ok) return
    setCategories(await res.json())
  }

  const fetchIdentities = async () => {
    const res = await fetch("/api/identities?kind=main")
    if (!res.ok) return
    setIdentities(await res.json())
  }

  const fetchPhones = async () => {
    const res = await fetch("/api/identities?kind=phone")
    if (!res.ok) return
    setPhones(await res.json())
  }

  const fetchTags = async () => {
    const res = await fetch("/api/tags")
    if (!res.ok) return
    const data = (await res.json()) as TagResponse
    setSiteTags(data.sections?.[0]?.tags || [])
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
      phoneIdentityId: data.phoneIdentityId || "",
      title: data.title || "",
      displayTitle: data.displayTitle || "",
      password: data.password || "",
      category: data.category || "other",
      notes: data.notes || "",
      favorite: !!data.favorite,
    })
    setSetAsMain(!!data.setAsMain)
    setBindIdentity(!!data.identityId)
    const existingTags = data.tags.filter((tag) => tag.type === "custom").map((tag) => tag.tag)
    setSelectedTags(existingTags)
    setSiteTags((prev) => Array.from(new Set([...prev, ...existingTags])))
    setTimestamps({
      createdAt: data.createdAt || "",
      updatedAt: data.updatedAt || "",
    })
    setLoading(false)
  }

  const handleChange = (name: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleIdentitySelect = (identityId: string) => {
    setFormData((prev) => ({
      ...prev,
      identityId,
    }))
    setError("")
  }

  const handleBindIdentityChange = (checked: boolean) => {
    setBindIdentity(checked)
    if (!checked) {
      setFormData((prev) => ({ ...prev, identityId: "" }))
      setError("")
      return
    }

    setFormData((prev) => ({
      ...prev,
      identityId: prev.identityId || identities[0]?.id || "",
    }))
  }

  const handleSetAsMainChange = (checked: boolean) => {
    setSetAsMain(checked)
    if (checked) {
      setBindIdentity(false)
      setFormData((prev) => ({ ...prev, identityId: "" }))
      setError("")
    }
  }

  const toggleTag = (value: string) => {
    setSelectedTags((prev) =>
      prev.includes(value) ? prev.filter((tag) => tag !== value) : [...prev, value]
    )
  }

  useEffect(() => {
    if (!bindIdentity || setAsMain || formData.identityId || identities.length === 0) return
    setFormData((prev) => ({ ...prev, identityId: identities[0]?.id || "" }))
  }, [bindIdentity, formData.identityId, identities, setAsMain])

  const handleCreateTagPreset = async () => {
    const name = newTagName.trim()
    if (!name) return

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      setError(await res.text())
      return
    }
    setNewTagName("")
    setError("")
    await fetchTags()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      if (!setAsMain && bindIdentity && !formData.identityId) {
        throw new Error("已选择挂到主账号下，请先选择主账号")
      }

      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          identityId: !setAsMain && bindIdentity ? formData.identityId || null : null,
          phoneIdentityId: formData.phoneIdentityId || null,
          setAsMain,
          tags: selectedTags,
        }),
      })
      if (!res.ok) throw new Error(await res.text())

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

  const categorySelectOptions = categoryOptions.map((category) => ({
    value: category.value,
    label: category.label,
  }))

  const mainIdentityOptions = identities.map((identity) => ({
    value: identity.id,
    label: identity.name,
    description:
      identity.notes && identity.notes !== identity.name
        ? `主账号：${identity.notes}`
        : identity.identifier,
  }))

  const selectedIdentity = identities.find((identity) => identity.id === formData.identityId)
  const selectedPhone = phones.find((phone) => phone.id === formData.phoneIdentityId)
  const phoneOptions = phones.map((phone) => ({
    value: phone.id,
    label: phone.name,
    description: phone.notes?.trim() ? `${phone.identifier} · ${phone.notes}` : phone.identifier,
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack flex items-center justify-center transition-colors">
        <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-gray-50 dark:bg-marketingBlack flex flex-col overflow-hidden transition-colors">
      <div className="w-full border-b border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-white/95 dark:bg-[#101113]/95 backdrop-blur">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-textPrimary">编辑账号</h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button type="button" onClick={() => copyToClipboard(formData.title, "account")} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700">
                {copyStatus === "account" ? <CheckCircle2 className="w-4 h-4" /> : "复制账号"}
              </button>
              <button type="button" onClick={() => copyToClipboard(formData.password, "password")} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700">
                {copyStatus === "password" ? <CheckCircle2 className="w-4 h-4" /> : "复制密码"}
              </button>
              <button type="button" onClick={() => copyToClipboard(`主账号: ${selectedIdentity?.name || "未绑定"}\n账号: ${formData.title}\n密码: ${formData.password}`, "all")} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700">
                {copyStatus === "all" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-4">
          {error ? <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div> : null}

          <form id="edit-item-form" onSubmit={handleSubmit} className="space-y-5 pb-6">
          <section className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-violet-50/80 p-4 shadow-sm dark:border-[rgba(255,255,255,0.08)] dark:from-[rgba(255,255,255,0.04)] dark:to-[rgba(168,85,247,0.12)] dark:shadow-none">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAsMainChange(!setAsMain)}
                  className="inline-flex items-center gap-3 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.12)] px-3 py-2 bg-white/80 dark:bg-[rgba(255,255,255,0.02)] hover:border-brandIndigo/60 transition-colors"
                  aria-pressed={setAsMain}
                >
                  <span
                    className={`h-6 w-6 rounded-md border flex items-center justify-center transition-colors ${
                      setAsMain
                        ? "bg-brandIndigo border-brandIndigo text-white"
                        : "bg-white dark:bg-transparent border-gray-300 dark:border-[rgba(255,255,255,0.25)] text-transparent"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-textPrimary">作为主账号</span>
                </button>

                {!setAsMain ? (
                  <button
                    type="button"
                    onClick={() => handleBindIdentityChange(!bindIdentity)}
                    className="inline-flex items-center gap-3 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.12)] px-3 py-2 bg-white/80 dark:bg-[rgba(255,255,255,0.02)] hover:border-brandIndigo/60 transition-colors"
                    aria-pressed={bindIdentity}
                  >
                    <span
                      className={`h-6 w-6 rounded-md border flex items-center justify-center transition-colors ${
                        bindIdentity
                          ? "bg-brandIndigo border-brandIndigo text-white"
                          : "bg-white dark:bg-transparent border-gray-300 dark:border-[rgba(255,255,255,0.25)] text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-textPrimary">挂到主账号下</span>
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-600 dark:text-textSecondary">
                主账号保持独立展示，子账号只记录归属关系，不会自动覆盖你当前填写的账号内容。
              </p>
            </div>
            {!setAsMain && bindIdentity ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-textSecondary">
                    选择归属的主账号
                  </label>
                  <SelectMenu
                    value={formData.identityId}
                    onChange={handleIdentitySelect}
                    options={mainIdentityOptions}
                    placeholder="请选择主账号"
                    emptyMessage="还没有主账号，请先把一个账号设为主账号。"
                  />
                </div>
                {selectedIdentity ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
                    当前将作为“{selectedIdentity.name}”下面的子账号保存。
                  </div>
                ) : null}
                {identities.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">暂无可选主账号，请先把一个可独立登录的账号设为主账号。</p>
                ) : null}
              </>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-textSecondary">
                绑定手机号
              </label>
              <SelectMenu
                value={formData.phoneIdentityId}
                onChange={(value) => handleChange("phoneIdentityId", value)}
                options={phoneOptions}
                placeholder="请选择手机号"
                emptyMessage="还没有手机号，请先去个人中心添加。"
              />
              {selectedPhone ? (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  当前绑定手机号：{selectedPhone.identifier}
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">分类</label>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
                  <Button type="button" variant="brand" onClick={handleAddCategory}>添加</Button>
                </div>
              ) : (
                <SelectMenu
                  value={formData.category}
                  onChange={(value) => handleChange("category", value)}
                  options={categorySelectOptions}
                  placeholder="请选择分类"
                />
              )}
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => setIsAddingCategory((prev) => !prev)} className="text-xs text-brandIndigo inline-flex items-center">
                <Plus className="w-3 h-3 mr-1" />
                {isAddingCategory ? "取消新分类" : "新分类"}
              </button>
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">账号 *</label>
              <input required value={formData.title} onChange={(e) => handleChange("title", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">密码</label>
              <input value={formData.password} onChange={(e) => handleChange("password", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">标题</label>
              <input value={formData.displayTitle} onChange={(e) => handleChange("displayTitle", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
            </div>
          </section>

          <section className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary">常用平台（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {siteTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedTags.includes(tag) ? "bg-brandIndigo border-brandIndigo text-white" : "bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brandIndigo/50"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="新增平台标签"
                className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.02)]"
              />
              <Button type="button" variant="outline" onClick={handleCreateTagPreset}>新增</Button>
            </div>
          </section>

          <section>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-textSecondary">备注</label>
            <textarea rows={4} value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
          </section>

          <div className="text-center text-[11px] text-gray-400 dark:text-textTertiary">
            创建于: {formatDate(timestamps.createdAt)}
            {timestamps.updatedAt && timestamps.createdAt && new Date(timestamps.updatedAt).getTime() - new Date(timestamps.createdAt).getTime() > 1000 ? ` · 更新于: ${formatDate(timestamps.updatedAt)}` : ""}
          </div>
        </form>
        </div>
      </div>

      <div className="w-full border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-white/95 dark:bg-[#101113]/95 backdrop-blur">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-2.5 flex justify-between items-center gap-2">
          <button type="button" onClick={handleDelete} className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors flex items-center text-sm font-medium" disabled={saving}>
            <Trash2 className="w-4 h-4 mr-2" />
            删除
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>取消</Button>
            <Button form="edit-item-form" type="submit" disabled={saving} variant="brand">{saving ? "保存中..." : "保存修改"}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
