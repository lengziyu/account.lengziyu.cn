"use client"

import { useEffect, useState } from "react"
import { Bell, Plus, RefreshCcw, Send, Trash2, X } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Skeleton } from "@/components/ui/Skeleton"
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
  source?: "database"
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
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [defaultDays, setDefaultDays] = useState<number[]>([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [scanPreview, setScanPreview] = useState<ScanPreview | null>(null)
  const [deletingChannel, setDeletingChannel] = useState<NotificationChannel | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [activeAction, setActiveAction] = useState<"" | "rules" | "scan" | "test-form" | "test-channel" | "save-channel" | "delete-channel">("")

  useEffect(() => {
    void loadPage()
  }, [])

  const loadPage = async () => {
    setPageLoading(true)
    await Promise.all([fetchChannels(), fetchReminderRules(), fetchScanPreview()])
    setPageLoading(false)
  }

  const fetchChannels = async () => {
    const res = await fetch("/api/notifications/channels")
    if (!res.ok) return
    const data = (await res.json()) as { channels: NotificationChannel[] }
    setChannels(data.channels)
  }

  const fetchReminderRules = async () => {
    const res = await fetch("/api/reminder-rules")
    if (!res.ok) return
    const data = (await res.json()) as { days?: number[] }
    setDefaultDays(data.days || [])
  }

  const fetchScanPreview = async () => {
    const res = await fetch("/api/notifications/scan")
    if (!res.ok) return
    setScanPreview(await res.json())
  }

  const resetForm = () => {
    setForm(emptyForm)
  }

  const openCreateEditor = () => {
    resetForm()
    setMessage("")
    setEditorOpen(true)
  }

  const applyChannelToForm = (channel: NotificationChannel) => {
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
    setMessage("")
    setEditorOpen(true)
  }

  const hasFormValue =
    !!form.id ||
    !!form.name.trim() ||
    !!form.botToken.trim() ||
    !!form.chatId.trim() ||
    !!form.webhookUrl.trim() ||
    !!form.secret.trim() ||
    !form.enabled

  const toggleDefaultDay = (day: number) => {
    setDefaultDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  const saveDefaultRules = async () => {
    setActiveAction("rules")
    setSaving(true)
    setMessage("")
    const res = await fetch("/api/reminder-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: defaultDays }),
    })
    setSaving(false)
    setActiveAction("")
    if (!res.ok) {
      setMessage("默认提醒规则保存失败")
      return
    }
    setMessage("默认提醒规则已保存")
  }

  const saveChannel = async () => {
    setActiveAction("save-channel")
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
    setActiveAction("")
    if (!res.ok) {
      setMessage(await res.text())
      return
    }

    setMessage(form.id ? "通知渠道已更新" : "通知渠道已新增")
    resetForm()
    setEditorOpen(false)
    await Promise.all([fetchChannels(), fetchScanPreview()])
  }

  const testChannel = async (id?: string) => {
    setActiveAction(id ? "test-channel" : "test-form")
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
    setActiveAction("")
    if (!res.ok) {
      setMessage(await res.text())
      return
    }
    setMessage("测试消息已发出")
    await fetchChannels()
  }

  const deleteChannel = async () => {
    if (!deletingChannel?.id) return
    setActiveAction("delete-channel")
    setSaving(true)
    const res = await fetch(`/api/notifications/channels?id=${encodeURIComponent(deletingChannel.id)}`, {
      method: "DELETE",
    })
    setSaving(false)
    setActiveAction("")
    if (!res.ok) {
      setMessage("删除失败")
      return
    }
    setDeletingChannel(null)
    setMessage("通知渠道已删除")
    await Promise.all([fetchChannels(), fetchScanPreview()])
  }

  const runScan = async () => {
    setActiveAction("scan")
    setSaving(true)
    setMessage("")
    const res = await fetch("/api/notifications/scan", {
      method: "POST",
    })
    setSaving(false)
    setActiveAction("")
    if (!res.ok) {
      setMessage("执行扫描失败")
      return
    }
    setMessage("扫描已执行，已按规则推送可发送的提醒")
    await fetchScanPreview()
  }

  return (
    <div className="min-h-screen bg-transparent transition-colors">
      <div className="mx-auto max-w-[900px] px-4 py-8 pb-24 sm:px-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-gray-900 dark:text-textPrimary">提醒与推送</h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
              渠道、规则和扫描预览。
            </p>
          </div>
          <ThemeToggle />
        </div>

        {message ? (
          <div className="mb-4 rounded-xl border border-gray-200/80 bg-white/85 px-4 py-3 text-sm text-gray-700 shadow-sm backdrop-blur dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)] dark:text-textSecondary dark:shadow-none">
            {message}
          </div>
        ) : null}

        {pageLoading ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
            <div className="space-y-5">
              <Skeleton className="h-[220px] w-full rounded-xl" />
              <div className="space-y-3 rounded-xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">默认提醒规则</h2>
                <p className="mt-2 text-xs text-gray-500 dark:text-textSecondary">未单独覆盖的订阅将继承这里的提醒时间。</p>
              </div>
              <Button type="button" variant="outline" onClick={saveDefaultRules} disabled={saving} loading={activeAction === "rules"}>
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

            <div className="mt-6 flex items-center justify-between rounded-xl border border-white/70 bg-white/45 px-4 py-4 dark:border-white/10 dark:bg-white/5">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">手动执行一次扫描</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                  用当前默认规则扫描即将到期订阅，并直接推送到启用渠道。
                </div>
              </div>
              <Button type="button" variant="brand" onClick={runScan} disabled={saving} loading={activeAction === "scan"}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                立即扫描
              </Button>
            </div>

            <div className="mt-4 rounded-xl border border-white/70 bg-white/45 px-4 py-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">当前扫描预览</div>
              <div className="mt-2 text-xs text-gray-500 dark:text-textSecondary">
                待触发订阅：{scanPreview?.totalCandidates ?? 0}
              </div>
              <div className="mt-3 space-y-2">
                {scanPreview?.results.flatMap((result) => result.items).slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl bg-white/70 px-3 py-3 text-sm backdrop-blur dark:bg-white/5">
                    <div className="font-medium text-gray-900 dark:text-textPrimary">
                      {item.planName ? `${item.platformName} / ${item.planName}` : item.platformName}
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
            <section className="rounded-xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
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
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => applyChannelToForm(channel)}
                      className="w-full rounded-xl border border-gray-200 bg-white/60 px-4 py-4 text-left transition hover:border-brandIndigo/40 hover:bg-gray-50/60 dark:border-[rgba(255,255,255,0.08)] dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">
                            {channel.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                            {channel.type} · {channel.enabled ? "已启用" : "已停用"} · 数据库配置
                          </div>
                          {channel.lastVerifiedAt ? (
                            <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                              最近测试：{new Date(channel.lastVerifiedAt).toLocaleString("zh-CN")}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-start gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              void testChannel(channel.id)
                            }}
                            disabled={saving}
                            loading={activeAction === "test-channel"}
                          >
                            测试
                          </Button>
                          <span className="hidden rounded-lg border border-white/80 bg-white/70 px-2 py-1 text-[11px] text-gray-500 backdrop-blur sm:inline dark:border-white/10 dark:bg-white/5 dark:text-textSecondary">
                            点击编辑
                          </span>
                          <button
                            type="button"
                            aria-label={`删除 ${channel.name}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeletingChannel(channel)
                              setMessage("")
                            }}
                            disabled={saving}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-textPrimary">通知渠道</h2>
                  <p className="mt-2 text-xs text-gray-500 dark:text-textSecondary">支持 Telegram 和飞书群机器人。</p>
                </div>
                <Button type="button" variant="brand" onClick={openCreateEditor}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增渠道
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-white/70 bg-white/45 px-4 py-4 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-textSecondary">
                点击上方新增，或直接点“已配置渠道”卡片进入编辑弹框。测试失败时，页面顶部会展示接口返回的具体原因。
              </div>
            </section>
          </div>
        </div>
        )}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            aria-label="关闭渠道编辑弹窗"
            onClick={saving ? undefined : () => setEditorOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-xl border border-white/80 bg-white/92 p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-[#171b28]/95">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-textPrimary">
                  {form.id ? "编辑渠道" : "新增渠道"}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-textSecondary">
                  {form.id ? "调整当前通知渠道配置。" : "填写一个新的通知渠道配置。"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                disabled={saving}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:text-textSecondary dark:hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
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
                      placeholder="-100xxxxxxxx 或 @channel"
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

              <div className="flex flex-wrap justify-between gap-3 border-t border-gray-200/80 pt-4 dark:border-white/10">
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="brand" onClick={saveChannel} disabled={saving} loading={activeAction === "save-channel"}>
                    {form.id ? "保存修改" : "创建渠道"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => testChannel()} disabled={saving} loading={activeAction === "test-form"}>
                    <Send className="mr-2 h-4 w-4" />
                    测试当前配置
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="warning"
                    onClick={() => {
                      if (!hasFormValue) {
                        resetForm()
                        return
                      }
                      setConfirmingClear(true)
                    }}
                    disabled={saving}
                  >
                    清空表单
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
                    关闭
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmingClear}
        title="清空渠道表单"
        description="当前填写的渠道配置会被清空。确认继续吗？"
        confirmLabel="确认清空"
        tone="warning"
        busy={saving}
        onCancel={() => setConfirmingClear(false)}
        onConfirm={() => {
          resetForm()
          setConfirmingClear(false)
        }}
      />

      <ConfirmDialog
        open={!!deletingChannel}
        title="删除通知渠道"
        description={
          deletingChannel
            ? `确定删除渠道「${deletingChannel.name}」吗？删除后，这个渠道将不再参与提醒推送。`
            : ""
        }
        confirmLabel="确认删除"
        tone="danger"
        busy={saving}
        onCancel={() => setDeletingChannel(null)}
        onConfirm={() => void deleteChannel()}
      />
    </div>
  )
}
