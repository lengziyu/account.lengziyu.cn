"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { ArrowLeft, Plus, CopyMinus, Trash2, Check } from "lucide-react"

type Category = { id: string; name: string }
type Identity = { id: string; name: string; identifier: string; notes?: string | null }
type TagResponse = { sections: { label: string; tags: string[] }[] }

const HOT_PLATFORM_TAGS = [
  "微信",
  "QQ",
  "支付宝",
  "淘宝",
  "京东",
  "抖音",
  "ChatGPT",
  "Github",
  "Google",
  "Apple",
]

export default function NewItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"single" | "batch">("single")

  const [categories, setCategories] = useState<Category[]>([])
  const [identities, setIdentities] = useState<Identity[]>([])
  const [siteTags, setSiteTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showAllPlatformTags, setShowAllPlatformTags] = useState(false)

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [bindIdentity, setBindIdentity] = useState(false)
  const [setAsMain, setSetAsMain] = useState(false)
  const [newTagName, setNewTagName] = useState("")

  const [batchText, setBatchText] = useState("")
  const [parsedItems, setParsedItems] = useState<{ id: string; title: string; password: string }[]>([])

  const [formData, setFormData] = useState({
    identityId: "",
    title: "",
    displayTitle: "",
    password: "",
    category: "social",
    notes: "",
  })

  useEffect(() => {
    void Promise.all([fetchCategories(), fetchIdentities(), fetchTags()])
  }, [])

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
    setSiteTags(data.sections?.[0]?.tags || [])
  }

  const handleChange = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleIdentitySelect = (identityId: string) => {
    const selected = identities.find((item) => item.id === identityId)
    setFormData((prev) => ({
      ...prev,
      identityId,
      title: selected ? selected.notes || selected.name : prev.title,
    }))
    setError("")
  }

  const handleBindIdentityChange = (checked: boolean) => {
    setBindIdentity(checked)
    if (!checked) {
      setFormData((prev) => ({ ...prev, identityId: "" }))
      setError("")
    }
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

  const handleParseBatch = () => {
    const regex =
      /(?:账号|收件人|账户|Email|User)\s*[:：]\s*([^\s,，;；]+)\s+(?:密码|Password)\s*[:：]\s*([^\s,，;；]+)/gi
    const result: { id: string; title: string; password: string }[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(batchText)) !== null) {
      result.push({
        id: Math.random().toString(36).slice(2, 9),
        title: match[1],
        password: match[2],
      })
    }

    if (result.length === 0) {
      setError("未能解析到数据，请使用“账号: xxx 密码: yyy”格式。")
      return
    }

    setError("")
    setParsedItems(result)
  }

  const updateParsedItem = (id: string, field: "title" | "password", value: string) => {
    setParsedItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeParsedItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const isNotes = formData.category === "笔记" || formData.category === "note"

    try {
      if (!setAsMain && bindIdentity && !formData.identityId) {
        throw new Error("已勾选绑定主账号，请先选择主账号")
      }

      const basePayload = {
        identityId: !setAsMain && bindIdentity ? formData.identityId || null : null,
        category: formData.category,
        notes: formData.notes,
        tags: selectedTags,
        setAsMain,
        displayTitle: formData.displayTitle,
      }

      if (mode === "single") {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...basePayload,
            title: formData.title,
            password: isNotes ? "" : formData.password,
          }),
        })
        if (!res.ok) throw new Error(await res.text())
      } else {
        if (parsedItems.length === 0) throw new Error("没有可保存的数据，请先解析")
        const result = await Promise.all(
          parsedItems.map((item) =>
            fetch("/api/items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...basePayload,
                title: item.title,
                password: isNotes ? "" : item.password,
              }),
            })
          )
        )
        if (result.some((res) => !res.ok)) throw new Error("部分记录保存失败")
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "提交失败")
    } finally {
      setLoading(false)
    }
  }

  const presetCategories = [
    { value: "笔记", label: "笔记 (Note)" },
    { value: "social", label: "社交 (Social)" },
    { value: "website", label: "网站 (Website)" },
    { value: "device", label: "设备 (Device)" },
    { value: "dev", label: "开发 (Dev)" },
    { value: "finance", label: "金融 (Finance)" },
    { value: "other", label: "其他 (Other)" },
  ]

  const categoryOptions = [
    ...presetCategories,
    ...categories
      .filter((item) => !presetCategories.some((preset) => preset.value === item.name))
      .map((item) => ({ value: item.name, label: item.name })),
  ]

  const displayedSiteTags = (() => {
    if (showAllPlatformTags || siteTags.length <= 10) return siteTags

    const selectedInSiteTags = selectedTags.filter((tag) => siteTags.includes(tag))
    const hotTags = HOT_PLATFORM_TAGS.filter((tag) => siteTags.includes(tag))
    const fallbackTags = siteTags.filter(
      (tag) => !selectedInSiteTags.includes(tag) && !hotTags.includes(tag)
    )

    return Array.from(new Set([...selectedInSiteTags, ...hotTags, ...fallbackTags])).slice(0, 10)
  })()

  return (
    <div className="h-[100dvh] bg-gray-50 dark:bg-marketingBlack flex flex-col overflow-hidden transition-colors">
      <div className="w-full border-b border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-white/95 dark:bg-[#101113]/95 backdrop-blur">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-textPrimary">新增账号</h1>
          </div>

          <div className="flex p-1 mt-3 bg-gray-100 dark:bg-[rgba(255,255,255,0.03)] rounded-xl">
            <button type="button" onClick={() => setMode("single")} className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${mode === "single" ? "bg-white dark:bg-[#2c2c31] text-brandIndigo" : "text-gray-500"}`}>
              单条录入
            </button>
            <button type="button" onClick={() => setMode("batch")} className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${mode === "batch" ? "bg-white dark:bg-[#2c2c31] text-brandIndigo" : "text-gray-500"}`}>
              <span className="inline-flex items-center justify-center">
                <CopyMinus className="w-4 h-4 mr-2" />
                批量识别
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-4">
          {error ? <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-transparent">{error}</div> : null}

          <form
            id="new-item-form"
            onSubmit={handleSubmit}
            className="space-y-5 pb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.02)] dark:shadow-none"
          >
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => handleSetAsMainChange(!setAsMain)}
              className="inline-flex items-center gap-3 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.12)] px-3 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] hover:border-brandIndigo/60 transition-colors"
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
              <span className="text-sm font-medium text-gray-800 dark:text-textPrimary">设为主账号</span>
            </button>

            {!setAsMain ? (
            <button
              type="button"
              onClick={() => handleBindIdentityChange(!bindIdentity)}
              className="inline-flex items-center gap-3 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.12)] px-3 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] hover:border-brandIndigo/60 transition-colors"
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
              <span className="text-sm font-medium text-gray-800 dark:text-textPrimary">绑定主账号</span>
            </button>
            ) : null}
            {!setAsMain && bindIdentity ? (
              <>
                <select value={formData.identityId} onChange={(e) => handleIdentitySelect(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
                  <option value="">请选择主账号</option>
                  {identities.map((identity) => (
                    <option key={identity.id} value={identity.id}>
                      {identity.notes && identity.notes !== identity.name
                        ? `${identity.name} · ${identity.notes}`
                        : identity.name}
                    </option>
                  ))}
                </select>
                {identities.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">暂无可选主账号，请先在系统中准备主账号数据。</p>
                ) : null}
              </>
            ) : null}
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-1">分类</label>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="请输入分类名" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
                  <Button type="button" variant="brand" onClick={handleAddCategory}>添加</Button>
                </div>
              ) : (
                <select value={formData.category} onChange={(e) => handleChange("category", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => setIsAddingCategory((prev) => !prev)} className="text-xs text-brandIndigo inline-flex items-center">
                <Plus className="w-3 h-3 mr-1" />
                {isAddingCategory ? "取消新分类" : "新分类"}
              </button>
            </div>
          </section>

          {mode === "single" ? (
            <section className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-1">账号 *</label>
                <input type="text" required value={formData.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="请输入账号" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-1">密码</label>
                <input type="text" value={formData.password} onChange={(e) => handleChange("password", e.target.value)} placeholder="请输入密码" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-1">标题</label>
                <input type="text" value={formData.displayTitle} onChange={(e) => handleChange("displayTitle", e.target.value)} placeholder="请输入标题" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
              </div>
            </section>
          ) : (
            <section className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary">批量文本</label>
              <textarea rows={4} value={batchText} onChange={(e) => setBatchText(e.target.value)} placeholder="请输入批量文本，例如：账号：test@qq.com 密码：123456" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
              <Button type="button" variant="outline" onClick={handleParseBatch}>解析文本</Button>
              {parsedItems.length > 0 ? (
                <div className="space-y-2">
                  {parsedItems.map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <input value={item.title} onChange={(e) => updateParsedItem(item.id, "title", e.target.value)} placeholder="请输入账号" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.02)]" />
                      <input value={item.password} onChange={(e) => updateParsedItem(item.id, "password", e.target.value)} placeholder="请输入密码" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.02)]" />
                      <button type="button" onClick={() => removeParsedItem(item.id)} className="px-3 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          <section className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary">常用平台（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {displayedSiteTags.map((tag) => (
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
            {siteTags.length > 10 ? (
              <button
                type="button"
                onClick={() => setShowAllPlatformTags((prev) => !prev)}
                className="text-xs text-brandIndigo hover:text-brandIndigo/80 transition-colors"
              >
                {showAllPlatformTags ? "收起平台列表" : `展开全部平台（${siteTags.length}）`}
              </button>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="请输入平台名称"
                className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.02)]"
              />
              <Button type="button" variant="outline" onClick={handleCreateTagPreset}>新增</Button>
            </div>
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-1">备注</label>
            <textarea rows={4} value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="请输入备注" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]" />
          </section>
        </form>
        </div>
      </div>

      <div className="w-full border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-white/95 dark:bg-[#101113]/95 backdrop-blur">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-2.5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>取消</Button>
          <Button form="new-item-form" type="submit" disabled={loading || (mode === "batch" && parsedItems.length === 0)} variant="brand">
            {loading ? "保存中..." : mode === "batch" ? `批量保存 ${parsedItems.length} 条` : "保存"}
          </Button>
        </div>
      </div>
    </div>
  )
}
