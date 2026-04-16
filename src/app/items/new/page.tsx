"use client"

import { useState, useEffect, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { ArrowLeft, Plus, X, CopyMinus, Trash2, ChevronDown } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export default function NewItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [mode, setMode] = useState<"single" | "batch">("single")
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)

  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // Tags logic
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: "", 
    password: "",
    category: "social",
    notes: ""
  })
  const [isPreview, setIsPreview] = useState(false)

  // Batch states
  const [batchText, setBatchText] = useState("")
  const [parsedItems, setParsedItems] = useState<{id: string, title: string, password: string}[]>([])

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

  const handleParseBatch = () => {
    const regex = /(?:账号|收件人|账户|Email|User)\s*[:：]\s*([^\s,，;；]+)\s+(?:密码|Password)\s*[:：]\s*([^\s,，;；]+)/gi;
    let match;
    const items = [];
    while ((match = regex.exec(batchText)) !== null) {
      items.push({
        id: Math.random().toString(36).substr(2, 9),
        title: match[1],
        password: match[2]
      });
    }

    if (items.length === 0) {
      setError("未能解析到数据。请确保文本包含【账号：xxx 密码：yyy】这样的基本间隔结构！");
      return;
    }
    setError("");
    setParsedItems(items);
  }

  const updateParsedItem = (id: string, field: "title" | "password", val: string) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item))
  }
  
  const removeParsedItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const isNotes = formData.category === "笔记" || formData.category === "note";

      if (mode === "single") {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            password: isNotes ? "" : formData.password,
            tags: selectedTags
          })
        })
        if (!res.ok) throw new Error("Failed to create item")
      } else {
        if (parsedItems.length === 0) throw new Error("没有可保存的数据，请先解析");
        const promises = parsedItems.map(item => fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            password: isNotes ? "" : item.password,
            category: formData.category,
            notes: formData.notes, 
            tags: selectedTags
          })
        }))
        const results = await Promise.all(promises);
        if (results.some(r => !r.ok)) throw new Error("部分数据保存失败");
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
    { value: "笔记", label: "笔记 (Note)" },
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

  const isNotes = formData.category === "笔记" || formData.category === "note";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack flex flex-col p-4 sm:p-8 transition-colors pb-24">
      <div className="max-w-xl w-full mx-auto bg-white dark:bg-[rgba(255,255,255,0.02)] rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-[rgba(255,255,255,0.08)] p-6 sm:p-8 overflow-hidden relative">
        <div className="flex items-center mb-8 space-x-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-textPrimary">新增安全记录</h1>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 mb-8 bg-gray-100 dark:bg-[rgba(255,255,255,0.03)] rounded-xl relative">
          <div 
            className="absolute top-1 bottom-1 left-1 bg-white dark:bg-[#2c2c31] rounded-lg shadow-sm transition-transform duration-300 pointer-events-none" 
            style={{ width: "calc(50% - 4px)", transform: mode === "single" ? "translateX(0)" : "translateX(100%)" }}
          />
          <button 
            type="button" 
            onClick={() => { setMode("single"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium z-10 transition-colors ${mode === "single" ? "text-brandIndigo dark:text-textPrimary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}
          >
            单条录入
          </button>
          <button 
            type="button" 
            onClick={() => { setMode("batch"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium z-10 flex items-center justify-center transition-colors ${mode === "batch" ? "text-brandIndigo dark:text-textPrimary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}
          >
            <CopyMinus className="w-4 h-4 mr-2" /> 智能批量识别
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-transparent">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Category (Shared for both modes) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary">分类</label>
              <button 
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-xs text-brandIndigo flex items-center px-2 py-0.5 rounded-full hover:bg-brandIndigo/5 transition-colors"
              >
                <Plus className="w-3 h-3 mr-1" /> 新分类
              </button>
            </div>
            {isAddingCategory ? (
              <div className="flex space-x-2 animate-in fade-in slide-in-from-top-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brandIndigo text-gray-900 dark:text-textPrimary transition-all text-sm"
                  placeholder="新分类名称"
                />
                <Button type="button" onClick={handleAddCategory} variant="brand" className="px-4 rounded-xl">确认</Button>
                <Button type="button" onClick={() => setIsAddingCategory(false)} variant="outline" className="rounded-xl border-gray-200">取消</Button>
              </div>
            ) : (
              <div className="relative z-20">
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brandIndigo text-gray-900 dark:text-textPrimary transition-all text-sm flex justify-between items-center"
                >
                  <span className="truncate">{allCategories.find(c => c.value === formData.category)?.label || formData.category}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Backdrop to close when clicked outside (optional simple implementation) */}
                {categoryDropdownOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setCategoryDropdownOpen(false)}></div>
                )}
                
                {/* Dropdown Menu */}
                {categoryDropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white dark:bg-[#1a1b1e] border border-gray-100 dark:border-[rgba(255,255,255,0.1)] rounded-xl shadow-xl overflow-hidden py-1.5 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                    {allCategories.map(cat => (
                      <div
                        key={cat.value}
                        onClick={() => {
                          handleChange({ target: { name: 'category', value: cat.value } } as any);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                          formData.category === cat.value 
                            ? "bg-brandIndigo/10 text-brandIndigo font-[510]" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.05)]"
                        }`}
                      >
                        {cat.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SINGLE MODE FIELDS */}
          {mode === "single" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 2. Account / Title */}
                <div className={`relative ${isNotes ? "col-span-2" : ""}`}>
                  <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary mb-2">
                    {isNotes ? "标题 *" : "账号 *"}
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleTitleChange}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:bg-white dark:focus:bg-[rgba(255,255,255,0.03)] text-gray-900 dark:text-textPrimary transition-all text-sm"
                    placeholder={isNotes ? "输入笔记标题" : "账号名 / 邮箱"}
                    autoComplete="off"
                  />
                  {showEmailSuggestions && !isNotes && (
                    <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1a1b1e] border border-gray-100 dark:border-[rgba(255,255,255,0.15)] rounded-xl shadow-xl overflow-hidden text-sm">
                      {emailSuggestions.map((suggestion, index) => (
                        <li
                          key={suggestion}
                          onMouseDown={(e) => { e.preventDefault(); selectEmailSuggestion(suggestion); }}
                          className={`px-4 py-2 cursor-pointer transition-colors ${
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

                {/* 3. Password (Hidden if Notes) */}
                {!isNotes && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary mb-2">密码</label>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:bg-white dark:focus:bg-[rgba(255,255,255,0.03)] text-gray-900 dark:text-textPrimary transition-all text-sm"
                      placeholder="安全密码"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BATCH MODE PARSER */}
          {mode === "batch" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary mb-2">原始剪贴板文本 *</label>
                <textarea
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brandIndigo text-gray-900 dark:text-textPrimary transition-all text-sm mb-3 font-mono"
                  placeholder={`输入例如:\n账号：test@qq.com  密码：123456\n账号：user02  密码：pass789`}
                />
                <Button type="button" onClick={handleParseBatch} variant="outline" className="w-full border-dashed rounded-xl">
                  ⬇️ 解析以上文本
                </Button>
              </div>

              {parsedItems.length > 0 && (
                <div className="p-4 bg-brandIndigo/5 border border-brandIndigo/20 rounded-2xl">
                  <h3 className="text-sm font-semibold text-brandIndigo mb-3">已成功识别 {parsedItems.length} 条记录</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {parsedItems.map((item, i) => (
                      <div key={item.id} className="flex space-x-2 items-center bg-white dark:bg-[#1a1b1e] p-2 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                        <span className="text-xs font-medium text-gray-400 w-4 text-center shrink-0">{i+1}</span>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateParsedItem(item.id, "title", e.target.value)}
                          className="flex-1 bg-transparent text-sm border focus:border-brandIndigo focus:ring-1 focus:ring-brandIndigo outline-none px-2 py-1 rounded transition-all dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                          placeholder={isNotes ? "标题" : "账号"}
                        />
                        {!isNotes && (
                          <input
                            type="text"
                            value={item.password}
                            onChange={(e) => updateParsedItem(item.id, "password", e.target.value)}
                            className="flex-1 bg-transparent text-sm border focus:border-brandIndigo focus:ring-1 focus:ring-brandIndigo outline-none px-2 py-1 rounded transition-all dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                            placeholder="密码"
                          />
                        )}
                        <button type="button" onClick={() => removeParsedItem(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shared specific fields layout container */}
          <div className="p-5 bg-gray-50/50 dark:bg-[rgba(255,255,255,0.01)] rounded-2xl border border-gray-100/50 dark:border-[rgba(255,255,255,0.03)] space-y-6">
            
            {/* 4. Tags (Shared) */}
            <div>
              <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary mb-2">{mode === 'batch' ? '为所有记录统一添加标签 (可选)' : '标签 (Tags)'}</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-brandIndigo border-brandIndigo text-white font-medium"
                        : "bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brandIndigo/50"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-sm transition-all focus-within:ring-2 focus-within:ring-brandIndigo drop-shadow-sm dark:drop-shadow-none">
                {selectedTags.map(t => (
                  <span key={t} className="flex items-center px-2 py-1 bg-brandIndigo/10 text-brandIndigo font-medium rounded-lg">
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
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-white dark:placeholder-gray-500 text-[13px]"
                  placeholder="回车键入新标签..."
                />
              </div>
            </div>

            {/* 5. Notes (Shared) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary">{mode === 'batch' ? '所有记录的共有备注' : '备注 (支持 Markdown)'}</label>
                <div className="flex space-x-2 text-xs bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] p-0.5 rounded-lg">
                  <button 
                    type="button" 
                    onClick={() => setIsPreview(false)}
                    className={`px-2.5 py-1 rounded-md transition-all ${!isPreview ? 'bg-white dark:bg-[#2c2c31] text-brandIndigo dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    编写
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsPreview(true)}
                    className={`px-2.5 py-1 rounded-md transition-all ${isPreview ? 'bg-white dark:bg-[#2c2c31] text-brandIndigo dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    预览
                  </button>
                </div>
              </div>
              
              {isPreview ? (
                <div className={`w-full ${isNotes ? 'min-h-[200px]' : 'min-h-[100px]'} px-4 py-4 bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-gray-900 dark:text-textPrimary prose dark:prose-invert prose-sm max-w-none shadow-inner`}>
                  {formData.notes ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.notes}</ReactMarkdown>
                  ) : (
                    <span className="text-gray-400 italic">空空如也~</span>
                  )}
                </div>
              ) : (
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={isNotes ? 10 : 3}
                  className="w-full px-4 py-3 bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brandIndigo text-gray-900 dark:text-textPrimary shadow-inner transition-all text-sm font-mono"
                  placeholder="畅所欲言... (若为笔记推荐填在此处)"
                />
              )}
            </div>
          </div>

          <div className="pt-6 mt-4 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl px-6 border-gray-200">
              取消返回
            </Button>
            <Button type="submit" disabled={loading || (mode === 'batch' && parsedItems.length === 0)} variant="brand" className="rounded-xl px-8 shadow-lg shadow-brandIndigo/25">
              {loading ? "执行中..." : (mode === "batch" ? `批量保存 ${parsedItems.length} 条记录` : "独家存档")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
