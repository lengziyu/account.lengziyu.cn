"use client"

import { useState, useEffect, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { ArrowLeft, Plus, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export default function NewItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isPreview, setIsPreview] = useState(false)

  // Tags logic
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: "", // This is now used as 'Account'
    password: "",
    category: "other",
    notes: ""
  })

  useEffect(() => {
    fetchCategories()
    fetchTags()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (e) {}
  }

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags")
      if (res.ok) {
        const data = await res.json()
        setAvailableTags(data)
      }
    } catch (e) {}
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })
      if (res.ok) {
        const newCat = await res.json()
        setCategories(prev => [...prev, newCat])
        setFormData(prev => ({ ...prev, category: newCat.name }))
        setIsAddingCategory(false)
        setNewCategoryName("")
      } else {
        const msg = await res.text()
        setError(msg)
      }
    } catch (e) {}
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = tagInput.trim()
      if (t && !selectedTags.includes(t)) {
        setSelectedTags([...selectedTags, t])
      }
      setTagInput("")
    }
  }

  const toggleTag = (t: string) => {
    if (selectedTags.includes(t)) {
      setSelectedTags(selectedTags.filter(st => st !== t))
    } else {
      setSelectedTags([...selectedTags, t])
    }
  }

  const COMMON_DOMAINS = ["@qq.com", "@gmail.com", "@163.com", "@outlook.com", "@foxmail.com", "@hotmail.com", "@yahoo.com", "@icloud.com"]
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFormData(prev => ({ ...prev, title: val }))

    if (val.includes("@")) {
      const parts = val.split("@")
      // Only trigger if we are typing the last part
      if (parts.length === 2) {
        const [prefix, suffix] = parts
        const matchedDomains = COMMON_DOMAINS.filter(d => d.startsWith("@" + suffix))
        if (matchedDomains.length > 0 && val !== prefix + matchedDomains[0]) {
          setEmailSuggestions(matchedDomains.map(d => prefix + d))
          setShowEmailSuggestions(true)
          setActiveSuggestionIndex(0)
          return
        }
      }
    }
    setShowEmailSuggestions(false)
  }

  const selectEmailSuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, title: suggestion }))
    setShowEmailSuggestions(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showEmailSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestionIndex(prev => (prev + 1) % emailSuggestions.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestionIndex(prev => (prev - 1 + emailSuggestions.length) % emailSuggestions.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        selectEmailSuggestion(emailSuggestions[activeSuggestionIndex])
      } else if (e.key === "Escape") {
        setShowEmailSuggestions(false)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: selectedTags
        })
      })

      if (!res.ok) {
        throw new Error("Failed to create item")
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const presetCategories = [
    { value: "social", label: "社交 (Social)" },
    { value: "website", label: "网站 (Website)" },
    { value: "device", label: "设备 (Device)" },
    { value: "dev", label: "开发 (Dev)" },
    { value: "finance", label: "金融 (Finance)" },
    { value: "other", label: "其他 (Other)" },
  ]

  const allCategories = [
    ...presetCategories,
    ...categories.filter(c => !presetCategories.some(pc => pc.value === c.name)).map(c => ({ value: c.name, label: c.name }))
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack flex flex-col p-4 sm:p-8 transition-colors">
      <div className="max-w-xl w-full mx-auto bg-white dark:bg-[rgba(255,255,255,0.02)] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-[rgba(255,255,255,0.08)] p-6 sm:p-8">
        <div className="flex items-center mb-6 space-x-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-textPrimary">新建账号记录</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-2">标签 (Tags)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-brandIndigo border-brandIndigo text-white"
                      : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg text-sm transition-all focus-within:ring-2 focus-within:ring-brandIndigo focus-within:bg-white dark:focus-within:bg-[rgba(255,255,255,0.03)]">
              {selectedTags.map(t => (
                <span key={t} className="flex items-center px-2 py-1 bg-brandIndigo/10 dark:bg-brandIndigo/20 text-brandIndigo dark:text-accentHover rounded">
                  {t}
                  <button type="button" onClick={() => toggleTag(t)} className="ml-1 hover:text-brandIndigo/60">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-white dark:placeholder-gray-500"
                placeholder="回车即可创建新标签..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-1">账号 *</label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:bg-white dark:focus:bg-[rgba(255,255,255,0.03)] text-gray-900 dark:text-textPrimary transition-all"
                placeholder="yours@example.com / 账号名"
                autoComplete="off"
              />
              {showEmailSuggestions && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-marketingBlack border border-gray-200 dark:border-[rgba(255,255,255,0.15)] rounded-lg shadow-lg overflow-hidden">
                  {emailSuggestions.map((suggestion, index) => (
                    <li
                      key={suggestion}
                      onMouseDown={(e) => { e.preventDefault(); selectEmailSuggestion(suggestion); }}
                      className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                        index === activeSuggestionIndex 
                          ? "bg-brandIndigo text-white" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)]"
                      }`}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary mb-1">密码</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:bg-white dark:focus:bg-[rgba(255,255,255,0.03)] text-gray-900 dark:text-textPrimary transition-all"
                placeholder="输入密码"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary">分类</label>
              <button 
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-xs text-brandIndigo flex items-center hover:opacity-80"
              >
                <Plus className="w-3 h-3 mr-1" /> 新增分类
              </button>
            </div>
            {isAddingCategory ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brandIndigo text-gray-900 dark:text-textPrimary transition-all"
                  placeholder="输入新分类名称"
                />
                <Button type="button" onClick={handleAddCategory} variant="brand" className="px-4">保存</Button>
                <Button type="button" onClick={() => setIsAddingCategory(false)} variant="outline">取消</Button>
              </div>
            ) : (
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brandIndigo text-gray-900 dark:text-textPrimary transition-all appearance-none"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                {allCategories.map(cat => (
                  <option key={cat.value} value={cat.value} className="text-gray-900 dark:text-gray-900 bg-white">
                    {cat.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-textSecondary">备注 (支持 Markdown)</label>
              <div className="flex space-x-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsPreview(false)}
                  className={`px-2 py-1 rounded ${!isPreview ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  编辑
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsPreview(true)}
                  className={`px-2 py-1 rounded ${isPreview ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  预览
                </button>
              </div>
            </div>
            
            {isPreview ? (
              <div className="w-full min-h-[86px] px-4 py-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg text-gray-900 dark:text-textPrimary prose dark:prose-invert prose-sm max-w-none">
                {formData.notes ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.notes}</ReactMarkdown>
                ) : (
                  <span className="text-gray-400 italic">没有备注内容预览</span>
                )}
              </div>
            ) : (
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:bg-white dark:focus:bg-[rgba(255,255,255,0.03)] text-gray-900 dark:text-textPrimary transition-all"
                placeholder="请输入备注信息... 支持 Markdown 语法"
              />
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 dark:border-[rgba(255,255,255,0.08)]">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              取消
            </Button>
            <Button type="submit" disabled={loading} variant="brand">
              {loading ? "保存中..." : "保存记录"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
