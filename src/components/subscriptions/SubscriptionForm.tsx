"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectMenu } from "@/components/ui/SelectMenu"
import { Skeleton } from "@/components/ui/Skeleton"
import {
  COMMON_CURRENCY_OPTIONS,
  DEFAULT_REMINDER_DAYS,
  RENEWAL_CYCLE_OPTIONS,
  SUBSCRIPTION_DECISION_OPTIONS,
  deriveSubscriptionStatus,
  formatReminderLabel,
  REMINDER_DAY_PRESETS,
} from "@/lib/subscription-options"

type VaultItemOption = {
  id: string
  title: string
  displayTitle?: string | null
}

type DispatchLog = {
  id: string
  channelType: string
  status: string
  daysBefore: number
  triggerDateKey: string
  payloadSnapshot?: string | null
  errorMessage?: string | null
  sentAt?: string | null
  createdAt?: string | null
}

type SubscriptionFormValue = {
  id?: string
  vaultItemId?: string | null
  platformName: string
  planName: string
  status: string
  decision: string
  startedAt?: string | null
  expiresAt?: string | null
  renewalCycle?: string | null
  price?: number | null
  currency?: string | null
  autoRenew: boolean
  notes?: string | null
  reminderDays?: number[]
}

type SubscriptionFormProps = {
  mode: "create" | "edit"
  title: string
  description?: string
  value?: SubscriptionFormValue
  defaultReminderDays?: number[]
  logs?: DispatchLog[]
}

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getStatusMeta(expiresAt: string) {
  if (!expiresAt) {
    return {
      label: "等待填写到期时间",
      chipClassName: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-textSecondary",
      helper: "保存后会按到期时间自动计算状态。",
    }
  }

  const status = deriveSubscriptionStatus(new Date(expiresAt))
  if (status === "expired") {
    return {
      label: "已过期",
      chipClassName: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",
      helper: "已经过了到期日，仍可保留记录做后续处理。",
    }
  }

  if (status === "expiring") {
    return {
      label: "即将到期",
      chipClassName: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
      helper: "进入提醒窗口后，会按提醒规则推送。",
    }
  }

  return {
    label: "正常",
    chipClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    helper: "距离到期还有一段时间，系统会按规则等待提醒。",
  }
}

export function SubscriptionForm({
  mode,
  title,
  description,
  value,
  defaultReminderDays,
  logs = [],
}: SubscriptionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(mode === "edit")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showCustomCurrency, setShowCustomCurrency] = useState(false)
  const [items, setItems] = useState<VaultItemOption[]>([])
  const [resolvedDefaultReminderDays, setResolvedDefaultReminderDays] = useState<number[]>(
    defaultReminderDays && defaultReminderDays.length > 0 ? defaultReminderDays : DEFAULT_REMINDER_DAYS
  )

  const [formData, setFormData] = useState({
    vaultItemId: value?.vaultItemId || "",
    platformName: value?.platformName || "",
    planName: value?.planName || "",
    decision: value?.decision || "pending",
    startedAt: toDateInputValue(value?.startedAt),
    expiresAt: toDateInputValue(value?.expiresAt),
    renewalCycle: value?.renewalCycle || "",
    price: value?.price?.toString() || "",
    currency: value?.currency || "CNY",
    autoRenew: !!value?.autoRenew,
    notes: value?.notes || "",
  })

  const [useCustomReminderDays, setUseCustomReminderDays] = useState(!!value?.reminderDays?.length)
  const [selectedReminderDays, setSelectedReminderDays] = useState<number[]>(
    value?.reminderDays?.length ? value.reminderDays : resolvedDefaultReminderDays
  )

  useEffect(() => {
    void fetchItems()
    if (!defaultReminderDays) {
      void fetchDefaultReminderDays()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchItems = async () => {
    const res = await fetch("/api/items")
    if (!res.ok) return
    setItems(await res.json())
  }

  const fetchDefaultReminderDays = async () => {
    const res = await fetch("/api/reminder-rules")
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = (await res.json()) as { days?: number[] }
    const days = data.days?.length ? data.days : DEFAULT_REMINDER_DAYS
    setResolvedDefaultReminderDays(days)
    if (!value?.reminderDays?.length) {
      setSelectedReminderDays(days)
    }
    setLoading(false)
  }

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: item.displayTitle || item.title,
        description: item.displayTitle ? item.title : "关联此账号记录",
      })),
    [items]
  )

  const reminderDaysPreview = useCustomReminderDays ? selectedReminderDays : resolvedDefaultReminderDays
  const statusMeta = getStatusMeta(formData.expiresAt)
  const selectedItem = items.find((item) => item.id === formData.vaultItemId)
  const currencyOptions = [
    ...COMMON_CURRENCY_OPTIONS,
    { value: "__custom__", label: "自定义币种" },
  ]
  const currencySelectValue =
    COMMON_CURRENCY_OPTIONS.some((option) => option.value === formData.currency) || !formData.currency
      ? formData.currency || "CNY"
      : "__custom__"

  useEffect(() => {
    if (!selectedItem) return
    const nextPlatform = selectedItem.displayTitle || selectedItem.title
    setFormData((prev) => {
      if (mode === "edit" && prev.platformName.trim() && prev.platformName !== selectedItem.title && prev.platformName !== selectedItem.displayTitle) {
        return prev
      }
      return { ...prev, platformName: nextPlatform }
    })
  }, [selectedItem, mode])

  const toggleReminderDay = (day: number) => {
    setSelectedReminderDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  const handleChange = (name: keyof typeof formData, nextValue: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      if (!formData.platformName.trim()) {
        throw new Error("请填写平台名称")
      }
      if (!formData.expiresAt) {
        throw new Error("请填写到期时间")
      }
      if (useCustomReminderDays && selectedReminderDays.length === 0) {
        throw new Error("请至少选择一个提醒时间")
      }

      const payload = {
        vaultItemId: formData.vaultItemId || null,
        platformName: formData.platformName.trim(),
        planName: formData.planName.trim() || null,
        decision: formData.decision,
        startedAt: formData.startedAt || null,
        expiresAt: formData.expiresAt || null,
        renewalCycle: formData.renewalCycle || null,
        price: formData.price || null,
        currency: formData.currency.trim() || "CNY",
        autoRenew: formData.autoRenew,
        notes: formData.notes.trim() || null,
        reminderDays: useCustomReminderDays ? selectedReminderDays : [],
      }

      const res = await fetch(mode === "create" ? "/api/subscriptions" : `/api/subscriptions/${value?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error((await res.text()) || "保存失败")
      }

      router.push("/subscriptions")
      router.refresh()
    } catch (err: any) {
      setError(err?.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!value?.id) return
    setSaving(true)
    const res = await fetch(`/api/subscriptions/${value.id}`, { method: "DELETE" })
    if (!res.ok) {
      setSaving(false)
      setError("删除失败")
      return
    }
    router.push("/subscriptions")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent px-4 py-6">
        <div className="mx-auto max-w-[900px] space-y-4">
          <Skeleton className="h-16 w-full rounded-[24px]" />
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Skeleton className="h-[680px] w-full rounded-[28px]" />
            <Skeleton className="h-[520px] w-full rounded-[28px]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent transition-colors">
      <div className="sticky top-0 z-30 border-b border-white/70 bg-white/65 backdrop-blur dark:border-white/10 dark:bg-[#151927]/65">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push("/subscriptions")}
              className="inline-flex items-center text-xs text-gray-600 transition-colors hover:text-brandIndigo dark:text-textSecondary"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回订阅中心
            </button>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900 dark:text-textPrimary">{title}</h1>
            {description ? <p className="mt-1 text-xs text-gray-500 dark:text-textSecondary">{description}</p> : null}
          </div>

          {mode === "edit" ? (
            <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          ) : null}
        </div>

        <div className="mx-auto grid max-w-[900px] grid-cols-[0.9fr_1.4fr] gap-3 px-4 pb-3 sm:px-6">
          <Button type="button" variant="outline" onClick={() => router.push("/subscriptions")} disabled={saving} className="w-full">
            取消
          </Button>
          <Button type="submit" form="subscription-form" variant="brand" loading={saving} className="w-full">
            {mode === "create" ? "创建订阅" : "保存修改"}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-5 sm:px-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <form id="subscription-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
          <section className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">订阅信息</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-textSecondary">先关联账号，再补充平台和到期时间，保存会自动计算状态。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusMeta.chipClassName}`}>{statusMeta.label}</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">关联账号</span>
                <SelectMenu
                  value={formData.vaultItemId}
                  options={itemOptions}
                  placeholder="先选择关联账号"
                  onChange={(nextValue) => handleChange("vaultItemId", nextValue)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">平台名称 <span className="text-red-500">*</span></span>
                  <input
                    value={formData.platformName}
                    onChange={(event) => handleChange("platformName", event.target.value)}
                    placeholder="例如 ChatGPT、Notion、VPS"
                    className="w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-white/5 dark:text-textPrimary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">套餐名称</span>
                  <input
                    value={formData.planName}
                    onChange={(event) => handleChange("planName", event.target.value)}
                    placeholder="可留空，例如 Plus / Pro"
                    className="w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-white/5 dark:text-textPrimary"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">开通时间</span>
                  <input
                    type="date"
                    value={formData.startedAt}
                    onChange={(event) => handleChange("startedAt", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-white/5 dark:text-textPrimary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">到期时间 <span className="text-red-500">*</span></span>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(event) => handleChange("expiresAt", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-white/5 dark:text-textPrimary"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-xs text-violet-700 dark:border-violet-400/15 dark:bg-violet-500/10 dark:text-violet-200">
                {statusMeta.helper}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">续费周期</span>
                  <SelectMenu
                    value={formData.renewalCycle}
                    options={RENEWAL_CYCLE_OPTIONS}
                    placeholder="不设置"
                    onChange={(nextValue) => handleChange("renewalCycle", nextValue)}
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">续费决策</span>
                  <SelectMenu
                    value={formData.decision}
                    options={SUBSCRIPTION_DECISION_OPTIONS}
                    placeholder="选择当前决策"
                    onChange={(nextValue) => handleChange("decision", nextValue)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">金额</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(event) => handleChange("price", event.target.value)}
                    placeholder="例如 688"
                    className="w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-white/5 dark:text-textPrimary"
                  />
                </label>

                <div>
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">币种</span>
                  <SelectMenu
                    value={currencySelectValue}
                    options={currencyOptions}
                    placeholder="选择币种"
                    onChange={(nextValue) => {
                      if (nextValue === "__custom__") {
                        setShowCustomCurrency(true)
                        return
                      }
                      setShowCustomCurrency(false)
                      handleChange("currency", nextValue)
                    }}
                  />
                  {showCustomCurrency || currencySelectValue === "__custom__" ? (
                    <input
                      value={formData.currency}
                      onChange={(event) => handleChange("currency", event.target.value.toUpperCase())}
                      placeholder="输入自定义币种代码"
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-white/5 dark:text-textPrimary"
                    />
                  ) : null}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/45 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">自动续费</div>
                  <div className="text-xs text-gray-500 dark:text-textSecondary">仅作为记录展示，不影响提醒规则。</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoRenew}
                  onChange={(event) => handleChange("autoRenew", event.target.checked)}
                  className="h-4 w-4 accent-brandIndigo"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">备注</span>
                <textarea
                  value={formData.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                  placeholder="记录购买渠道、发票、优惠活动或续费建议"
                  rows={5}
                  className="w-full rounded-[22px] border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-white/10 dark:bg-white/5 dark:text-textPrimary"
                />
              </label>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brandIndigo" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">提醒规则</h2>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-textSecondary">
                默认规则：{resolvedDefaultReminderDays.map((day) => formatReminderLabel(day)).join(" / ")}
              </p>

              <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/45 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">单独覆盖默认提醒</div>
                  <div className="text-xs text-gray-500 dark:text-textSecondary">只对这条订阅生效。</div>
                </div>
                <input
                  type="checkbox"
                  checked={useCustomReminderDays}
                  onChange={(event) => setUseCustomReminderDays(event.target.checked)}
                  className="h-4 w-4 accent-brandIndigo"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                {REMINDER_DAY_PRESETS.map((day) => {
                  const active = reminderDaysPreview.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!useCustomReminderDays}
                      onClick={() => toggleReminderDay(day)}
                      className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                        active
                          ? "border-brandIndigo bg-brandIndigo text-white"
                          : "border-gray-200 bg-white/80 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-textSecondary"
                      } ${!useCustomReminderDays ? "opacity-60" : ""}`}
                    >
                      {formatReminderLabel(day)}
                    </button>
                  )
                })}
              </div>
            </section>

            {logs.length > 0 ? (
              <section className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">最近提醒记录</h2>
                <div className="mt-4 space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-gray-100 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">
                          {log.channelType} / {formatReminderLabel(log.daysBefore)}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] ${
                            log.status === "sent"
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                              : log.status === "failed"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-textSecondary"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">触发日：{log.triggerDateKey}</div>
                      {log.errorMessage ? <div className="mt-2 text-xs text-red-500">{log.errorMessage}</div> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="删除订阅"
        description={`确定删除「${formData.platformName || value?.platformName || "当前订阅"}」吗？删除后，这条订阅和提醒记录将无法恢复。`}
        confirmLabel="确认删除"
        tone="danger"
        busy={saving}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
