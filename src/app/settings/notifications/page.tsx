"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, RefreshCcw, Send } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Button } from "@/components/ui/Button"
import {
  formatReminderLabel,
  NOTIFICATION_CHANNEL_OPTIONS,
  REMINDER_DAY_PRESETS,
} from "@/lib/subscription-options"

type NotificationChannel = {
  id: string
  type: string
  name: string
  enabled: boolean
  lastVerifiedAt?: string | null
  source?: "database" | "env"
  config: {
    botToken?: string
    chatId?: string
    webhookUrl?: string
    secret?: string
  }
}

type ScanPreview = {
  totalUsers: number
  totalCandidates: number
  results: {
    userId: string
    count: number
    items: {
      id: string
      platformName: string
      planName: string
      expiresAt: string
      daysUntilExpiry: number
      channels: { id: string; type: string; name: string }[]
    }[]
  }[]
}

const emptyForm = {
  id: "",
  type: "telegram",
  name: "",
  enabled: true,
  botToken: "",
  chatId: "",
  webhookUrl: "",
  secret: "",
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [defaultDays, setDefaultDays] = useState<number[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [scanPreview, setScanPreview] = useState<ScanPreview | null>(null)
  const [usingEnvFallback, setUsingEnvFallback] = useState(false)

  useEffect(() => {
    void Promise.all([fetchChannels(), fetchReminderRules(), fetchScanPreview()])
  }, [])

  const fetchChannels = async () => {
    const res = await fetch("/api/notifications/channels")
    if (!res.ok) return
    const data = (await res.json()) as {
      channels: NotificationChannel[]
      usingEnvFallback?: boolean
    }
    setChannels(data.channels)
    setUsingEnvFallback(!!data.usingEnvFallback)
  }

  const fetchReminderRules = async () => {
    const res = await fetch("/api/reminder-rules")
    if (!res.ok) return
    const data = (await res.json()) as { days?: number[] }
    setDefaultDays(data.days || [])
    setLoading(false)
  }

  const fetchScanPreview = async () => {
    const res = await fetch("/api/notifications/scan")
    if (!res.ok) return
    setScanPreview(await res.json())
  }

  const resetForm = () => {
    setForm(emptyForm)
  }

  const toggleDefaultDay = (day: number) => {
    setDefaultDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  const saveDefaultRules = async () => {
    setSaving(true)
    setMessage("")
    const res = await fetch("/api/reminder-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: defaultDays }),
    })
    setSaving(false)
    if (!res.ok) {
      setMessage("默认提醒规则保存失败")
      return
    }
    setMessage("默认提醒规则已保存")
  }

  const saveChannel = async () => {
    setSaving(true)
    setMessage("")
    const payload = {
      id: form.id || undefined,
      type: form.type,
      name: form.name,
      enabled: form.enabled,
      config: {
        botToken: form.botToken,
        chatId: form.chatId,
        webhookUrl: form.webhookUrl,
        secret: form.secret,
      },
    }

    const res = await fetch("/api/notifications/channels", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      setMessage(await res.text())
      return
    }

    setMessage(form.id ? "通知渠道已更新" : "通知渠道已新增")
    resetForm()
    await Promise.all([fetchChannels(), fetchScanPreview()])
  }

  const testChannel = async (id?: string) => {
    setSaving(true)
    setMessage("")
    const payload = id
      ? { id }
      : {
          type: form.type,
          config: {
            botToken: form.botToken,
            chatId: form.chatId,
            webhookUrl: form.webhookUrl,
            secret: form.secret,
          },
        }

    const res = await fetch("/api/notifications/channels/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      setMessage(await res.text())
      return
    }
    setMessage("测试消息已发出")
    await fetchChannels()
  }

  const deleteChannel = async (id: string) => {
    if (!confirm("确定删除这个通知渠道吗？")) return
    setSaving(true)
    const res = await fetch(`/api/notifications/channels?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    setSaving(false)
    if (!res.ok) {
      setMessage("删除失败")
      return
    }
    setMessage("通知渠道已删除")
    await Promise.all([fetchChannels(), fetchScanPreview()])
  }

  const runScan = async () => {
    setSaving(true)
    setMessage("")
    const res = await fetch("/api/notifications/scan", {
      method: "POST",
    })
    setSaving(false)
    if (!res.ok) {
      setMessage("执行扫描失败")
      return
    }
    setMessage("扫描已执行，已按规则推送可发送的提醒")
    await fetchScanPreview()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-marketingBlack transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="inline-flex items-center text-sm text-gray-600 dark:text-textSecondary hover:text-brandIndigo transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回个人中心
            </button>
            <h1 className="mt-3 text-[30px] font-semibold tracking-tight text-gray-900 dark:text-textPrimary">提醒与推送</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-textSecondary">
              配置默认提醒时间、Telegram / 飞书渠道，并可手动触发一次到期扫描。
            </p>
          </div>
          <ThemeToggle />
        </div>

        {message ? (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)] dark:text-textSecondary dark:shadow-none">
            {message}
          </div>
        ) : null}

        {usingEnvFallback ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-none">
            当前没有数据库内的启用渠道，系统会直接使用 Vercel 环境变量里的机器人配置发送提醒。
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">默认提醒规则</h2>
                <p className="mt-2 text-xs text-gray-500 dark:text-textSecondary">未单独覆盖的订阅将继承这里的提醒时间。</p>
              </div>
              <Button type="button" variant="outline" onClick={saveDefaultRules} disabled={saving}>
                保存规则
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {REMINDER_DAY_PRESETS.map((day) => {
                const active = defaultDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDefaultDay(day)}
                    className={`rounded-full px-3 py-2 text-xs transition-colors ${
                      active
                        ? "bg-brandIndigo text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-textSecondary"
                    }`}
                  >
                    {formatReminderLabel(day)}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 dark:border-[rgba(255,255,255,0.08)]">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">手动执行一次扫描</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                  用当前默认规则扫描即将到期订阅，并直接推送到启用渠道。
                </div>
              </div>
              <Button type="button" variant="brand" onClick={runScan} disabled={saving}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                立即扫描
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 px-4 py-4 dark:border-[rgba(255,255,255,0.08)]">
              <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">当前扫描预览</div>
              <div className="mt-2 text-xs text-gray-500 dark:text-textSecondary">
                待触发订阅：{scanPreview?.totalCandidates ?? 0}
              </div>
              <div className="mt-3 space-y-2">
                {scanPreview?.results.flatMap((result) => result.items).slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl bg-gray-50 px-3 py-3 text-sm dark:bg-white/5">
                    <div className="font-medium text-gray-900 dark:text-textPrimary">
                      {item.platformName} / {item.planName}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                      还有 {item.daysUntilExpiry} 天到期，目标渠道 {item.channels.length} 个
                    </div>
                  </div>
                ))}
                {!scanPreview || scanPreview.totalCandidates === 0 ? (
                  <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-500 dark:bg-white/5 dark:text-textSecondary">
                    当前没有命中提醒规则的订阅。
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">通知渠道</h2>
                  <p className="mt-2 text-xs text-gray-500 dark:text-textSecondary">支持 Telegram 和飞书群机器人。</p>
                </div>
                <Button type="button" variant="outline" onClick={() => testChannel()} disabled={saving}>
                  <Send className="w-4 h-4 mr-2" />
                  测试表单配置
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">渠道类型</span>
                    <select
                      value={form.type}
                      onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    >
                      {NOTIFICATION_CHANNEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">显示名称</span>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="例如 主 Telegram 群"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                    />
                  </label>
                </div>

                {form.type === "telegram" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">Bot Token</span>
                      <input
                        value={form.botToken}
                        onChange={(event) => setForm((prev) => ({ ...prev, botToken: event.target.value }))}
                        placeholder="123456:AA..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">Chat ID</span>
                      <input
                        value={form.chatId}
                        onChange={(event) => setForm((prev) => ({ ...prev, chatId: event.target.value }))}
                        placeholder="-100xxxxxxxx"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">Webhook URL</span>
                      <input
                        value={form.webhookUrl}
                        onChange={(event) => setForm((prev) => ({ ...prev, webhookUrl: event.target.value }))}
                        placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-gray-600 dark:text-textSecondary">签名 Secret（可选）</span>
                      <input
                        value={form.secret}
                        onChange={(event) => setForm((prev) => ({ ...prev, secret: event.target.value }))}
                        placeholder="如开启签名校验，则填写"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
                      />
                    </label>
                  </div>
                )}

                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-gray-900 dark:text-textPrimary">启用这个渠道</div>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                    className="h-4 w-4 accent-brandIndigo"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="brand" onClick={saveChannel} disabled={saving}>
                    {form.id ? "更新渠道" : "新增渠道"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                    清空表单
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brandIndigo" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">已配置渠道</h2>
              </div>

              <div className="mt-4 space-y-3">
                {channels.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500 dark:bg-white/5 dark:text-textSecondary">
                    还没有渠道配置，先新增一个吧。
                  </div>
                ) : (
                  channels.map((channel) => (
                    <div key={channel.id} className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-[rgba(255,255,255,0.08)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">
                            {channel.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                            {channel.type} · {channel.enabled ? "已启用" : "已停用"} · {channel.source === "env" ? "环境变量" : "数据库"}
                          </div>
                          {channel.lastVerifiedAt ? (
                            <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                              最近测试：{new Date(channel.lastVerifiedAt).toLocaleString("zh-CN")}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {channel.source !== "env" ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setForm({
                                  id: channel.id,
                                  type: channel.type,
                                  name: channel.name,
                                  enabled: channel.enabled,
                                  botToken: channel.config.botToken || "",
                                  chatId: channel.config.chatId || "",
                                  webhookUrl: channel.config.webhookUrl || "",
                                  secret: channel.config.secret || "",
                                })
                              }
                            >
                              编辑
                            </Button>
                          ) : null}
                          <Button type="button" variant="outline" onClick={() => testChannel(channel.id)} disabled={saving}>
                            测试
                          </Button>
                          {channel.source !== "env" ? (
                            <Button type="button" variant="outline" onClick={() => deleteChannel(channel.id)} disabled={saving}>
                              删除
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
