"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectMenu } from "@/components/ui/SelectMenu"
import {
  DEFAULT_REMINDER_DAYS,
  formatReminderLabel,
  REMINDER_DAY_PRESETS,
  RENEWAL_CYCLE_OPTIONS,
  SUBSCRIPTION_DECISION_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
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
  lastRenewedAt?: string | null
  snoozeUntil?: string | null
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
  const [items, setItems] = useState<VaultItemOption[]>([])
  const [resolvedDefaultReminderDays, setResolvedDefaultReminderDays] = useState<number[]>(
    defaultReminderDays && defaultReminderDays.length > 0
      ? defaultReminderDays
      : DEFAULT_REMINDER_DAYS
  )

  const [formData, setFormData] = useState({
    vaultItemId: value?.vaultItemId || "",
    platformName: value?.platformName || "",
    planName: value?.planName || "",
    status: value?.status || "active",
    decision: value?.decision || "pending",
    startedAt: toDateInputValue(value?.startedAt),
    expiresAt: toDateInputValue(value?.expiresAt),
    renewalCycle: value?.renewalCycle || "",
    price: value?.price?.toString() || "",
    currency: value?.currency || "CNY",
    autoRenew: !!value?.autoRenew,
    notes: value?.notes || "",
    lastRenewedAt: toDateInputValue(value?.lastRenewedAt),
    snoozeUntil: toDateInputValue(value?.snoozeUntil),
  })

  const [useCustomReminderDays, setUseCustomReminderDays] = useState(
    !!value?.reminderDays && value.reminderDays.length > 0
  )
  const [selectedReminderDays, setSelectedReminderDays] = useState<number[]>(
    value?.reminderDays && value.reminderDays.length > 0
      ? value.reminderDays
      : resolvedDefaultReminderDays
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
    const days = data.days && data.days.length > 0 ? data.days : DEFAULT_REMINDER_DAYS
    setResolvedDefaultReminderDays(days)
    if (!value?.reminderDays || value.reminderDays.length === 0) {
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

  const reminderDaysPreview = useCustomReminderDays
    ? selectedReminderDays
    : resolvedDefaultReminderDays

  const toggleReminderDay = (day: number) => {
    setSelectedReminderDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  const handleChange = (name: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const reminderDays = useCustomReminderDays ? selectedReminderDays : []
      if (useCustomReminderDays && reminderDays.length === 0) {
        throw new Error("请至少选择一个提醒时间")
      }

      const payload = {
        vaultItemId: formData.vaultItemId || null,
        platformName: formData.platformName,
        planName: formData.planName,
        status: formData.status,
        decision: formData.decision,
        startedAt: formData.startedAt || null,
        expiresAt: formData.expiresAt || null,
        renewalCycle: formData.renewalCycle || null,
        price: formData.price || null,
        currency: formData.currency || "CNY",
        autoRenew: formData.autoRenew,
        notes: formData.notes || null,
        lastRenewedAt: formData.lastRenewedAt || null,
        snoozeUntil: formData.snoozeUntil || null,
        reminderDays,
      }

      const res = await fetch(
        mode === "create" ? "/api/subscriptions" : `/api/subscriptions/${value?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

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
    if (!value?.id || !confirm("确定要删除这条订阅吗？")) return
    setSaving(true)
    const res = await fetch(`/api/subscriptions/${value.id}`, {
      method: "DELETE",
    })
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
      <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <button
              type="button"
              onClick={() => router.push("/subscriptions")}
              className="inline-flex items-center text-sm text-gray-600 dark:text-textSecondary hover:text-brandIndigo transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回订阅中心
            </button>
            <h1 className="mt-3 text-[28px] font-semibold text-gray-900 dark:text-textPrimary tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm text-gray-500 dark:text-textSecondary">{description}</p>
            ) : null}
          </div>

          {mode === "edit" ? (
            <Button type="button" variant="outline" onClick={handleDelete} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
              <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">订阅信息</h2>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">平台名称</span>
                    <input
                      value={formData.platformName}
                      onChange={(event) => handleChange("platformName", event.target.value)}
                      placeholder="例如 ChatGPT、Notion、VPS"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">套餐名称</span>
                    <input
                      value={formData.planName}
                      onChange={(event) => handleChange("planName", event.target.value)}
                      placeholder="例如 Plus、Pro、年费会员"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                </div>

                <div>
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">关联账号</span>
                  <SelectMenu
                    value={formData.vaultItemId}
                    options={itemOptions}
                    placeholder="不关联账号"
                    onChange={(nextValue) => handleChange("vaultItemId", nextValue)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">状态</span>
                    <SelectMenu
                      value={formData.status}
                      options={SUBSCRIPTION_STATUS_OPTIONS}
                      placeholder="选择状态"
                      onChange={(nextValue) => handleChange("status", nextValue)}
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">开通时间</span>
                    <input
                      type="date"
                      value={formData.startedAt}
                      onChange={(event) => handleChange("startedAt", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">到期时间</span>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(event) => handleChange("expiresAt", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">续费周期</span>
                    <SelectMenu
                      value={formData.renewalCycle}
                      options={RENEWAL_CYCLE_OPTIONS}
                      placeholder="不设置"
                      onChange={(nextValue) => handleChange("renewalCycle", nextValue)}
                    />
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">金额</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(event) => handleChange("price", event.target.value)}
                      placeholder="例如 688"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">币种</span>
                    <input
                      value={formData.currency}
                      onChange={(event) => handleChange("currency", event.target.value)}
                      placeholder="CNY / USD"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">最近续费时间</span>
                    <input
                      type="date"
                      value={formData.lastRenewedAt}
                      onChange={(event) => handleChange("lastRenewedAt", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">延后到</span>
                    <input
                      type="date"
                      value={formData.snoozeUntil}
                      onChange={(event) => handleChange("snoozeUntil", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-[rgba(255,255,255,0.08)]">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">自动续费</div>
                    <div className="text-xs text-gray-500 dark:text-textSecondary">打开后仍会提醒，但方便区分处理方式。</div>
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
                    placeholder="记录购买渠道、发票、优惠活动、续费建议等"
                    rows={5}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandIndigo/60 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                  />
                </label>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brandIndigo" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">提醒规则</h2>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-textSecondary">
                  默认规则：{resolvedDefaultReminderDays.map((day) => formatReminderLabel(day)).join(" / ")}
                </p>

                <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-[rgba(255,255,255,0.08)]">
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
                            : "border-gray-200 bg-white text-gray-600 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textSecondary"
                        } ${!useCustomReminderDays ? "opacity-60" : ""}`}
                      >
                        {formatReminderLabel(day)}
                      </button>
                    )
                  })}
                </div>
              </section>

              {logs.length > 0 ? (
                <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">最近提醒记录</h2>
                  <div className="mt-4 space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-gray-100 px-4 py-3 dark:border-[rgba(255,255,255,0.08)]"
                      >
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
                        <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                          触发日：{log.triggerDateKey}
                        </div>
                        {log.errorMessage ? (
                          <div className="mt-2 text-xs text-red-500">{log.errorMessage}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/subscriptions")} disabled={saving}>
              取消
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? "保存中..." : mode === "create" ? "创建订阅" : "保存修改"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
