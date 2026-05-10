import crypto from "node:crypto"
import prisma from "@/lib/prisma"
import { DEFAULT_REMINDER_DAYS, deriveSubscriptionStatus, normalizeReminderDays } from "@/lib/subscription-options"

export type NotificationChannelConfig = {
  botToken?: string
  chatId?: string
  webhookUrl?: string
  secret?: string
}

export type ResolvedNotificationChannel = {
  id: string
  type: string
  name: string
  enabled: boolean
  configJson: string
  lastVerifiedAt: Date | null
  source: "database"
}

export type SubscriptionListItem = {
  id: string
  platformName: string
  planName: string
  status: string
  decision: string
  expiresAt: Date
  startedAt: Date | null
  renewalCycle: string | null
  price: number | null
  currency: string
  autoRenew: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  vaultItem: {
    id: string
    title: string
    displayTitle: string | null
  } | null
  reminderRules: {
    id: string
    daysBefore: number
    enabled: boolean
  }[]
  dispatchLogs?: {
    id: string
    channelType: string
    status: string
    daysBefore: number
    triggerDateKey: string
    sentAt: Date | null
  }[]
}

export function parseNullableDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function formatDateKey(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function diffInDays(target: Date, base: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  const targetDay = startOfDay(target).getTime()
  const baseDay = startOfDay(base).getTime()
  return Math.floor((targetDay - baseDay) / dayMs)
}

export function parseChannelConfig(configJson: string): NotificationChannelConfig {
  try {
    const parsed = JSON.parse(configJson || "{}")
    return typeof parsed === "object" && parsed ? parsed : {}
  } catch {
    return {}
  }
}

export async function getResolvedNotificationChannels(userId: string) {
  const dbChannels = await prisma.notificationChannel.findMany({
    where: { userId, enabled: true },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  })

  const mappedDbChannels: ResolvedNotificationChannel[] = dbChannels.map((channel) => ({
    id: channel.id,
    type: channel.type,
    name: channel.name,
    enabled: channel.enabled,
    configJson: channel.configJson,
    lastVerifiedAt: channel.lastVerifiedAt,
    source: "database",
  }))

  return {
    activeChannels: mappedDbChannels,
    dbChannels: mappedDbChannels,
  }
}

export async function resolveChannelById(userId: string, id: string) {
  const channel = await prisma.notificationChannel.findFirst({
    where: { id, userId },
  })

  if (channel) {
    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      enabled: channel.enabled,
      configJson: channel.configJson,
      lastVerifiedAt: channel.lastVerifiedAt,
      source: "database" as const,
    }
  }

  return null
}

export function normalizeChannelPayload(
  type: string,
  payload: NotificationChannelConfig
): NotificationChannelConfig {
  if (type === "telegram") {
    return {
      botToken: payload.botToken?.trim(),
      chatId: payload.chatId?.trim(),
    }
  }

  if (type === "feishu") {
    return {
      webhookUrl: payload.webhookUrl?.trim(),
      secret: payload.secret?.trim(),
    }
  }

  return {}
}

export function validateChannelPayload(type: string, payload: NotificationChannelConfig) {
  if (type === "telegram") {
    if (!payload.botToken || !payload.chatId) {
      throw new Error("Telegram 需要 botToken 和 chatId")
    }
    return
  }

  if (type === "feishu") {
    if (!payload.webhookUrl) {
      throw new Error("飞书需要 webhookUrl")
    }
    return
  }

  throw new Error("不支持的通知渠道")
}

export function resolveReminderDays(
  subscriptionRules: { daysBefore: number; enabled: boolean }[],
  defaultRules: { daysBefore: number; enabled: boolean }[]
) {
  const source = subscriptionRules.length > 0 ? subscriptionRules : defaultRules
  const days = source.filter((rule) => rule.enabled).map((rule) => rule.daysBefore)
  return normalizeReminderDays(days.length > 0 ? days : DEFAULT_REMINDER_DAYS)
}

export async function ensureVaultItemOwner(userId: string, vaultItemId?: string | null) {
  if (!vaultItemId) return null

  const item = await prisma.vaultItem.findFirst({
    where: { id: vaultItemId, userId },
    select: { id: true },
  })

  if (!item) {
    throw new Error("Vault item not found")
  }

  return item.id
}

export async function replaceReminderRules(
  userId: string,
  days: number[],
  subscriptionId?: string | null
) {
  const normalized = normalizeReminderDays(days)
  await prisma.reminderRule.deleteMany({
    where: { userId, subscriptionId: subscriptionId ?? null },
  })

  if (normalized.length === 0) return

  await prisma.reminderRule.createMany({
    data: normalized.map((daysBefore) => ({
      userId,
      subscriptionId: subscriptionId ?? null,
      daysBefore,
      enabled: true,
    })),
  })
}

export function buildSubscriptionMessage(
  subscription: SubscriptionListItem,
  daysBefore: number,
  baseUrl?: string
) {
  const expires = new Date(subscription.expiresAt)
  const link = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/subscriptions/${subscription.id}`
    : ""
  const amount =
    subscription.price != null
      ? `${subscription.currency} ${subscription.price.toFixed(2)}`
      : "未记录"

  const lines = [
    "会员到期提醒",
    subscription.planName ? `${subscription.platformName} / ${subscription.planName}` : subscription.platformName,
    `到期时间：${expires.getFullYear()}-${`${expires.getMonth() + 1}`.padStart(2, "0")}-${`${expires.getDate()}`.padStart(2, "0")}`,
    `提醒节点：${daysBefore === 0 ? "当天" : `提前 ${daysBefore} 天`}`,
    `自动续费：${subscription.autoRenew ? "已开启" : "未开启"}`,
    `金额：${amount}`,
    `当前决策：${subscription.decision}`,
  ]

  if (subscription.vaultItem) {
    lines.push(
      `关联账号：${subscription.vaultItem.displayTitle || subscription.vaultItem.title}`
    )
  }

  if (link) {
    lines.push(`处理链接：${link}`)
  }

  return lines.join("\n")
}

async function sendTelegramMessage(payload: NotificationChannelConfig, text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${payload.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: payload.chatId,
        text,
      }),
    }
  )

  const rawText = await response.text()
  let data: { ok?: boolean; description?: string } | null = null
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.description || rawText || "Telegram 推送失败")
  }

  if (data && data.ok === false) {
    throw new Error(data.description || "Telegram 推送失败")
  }
}

function buildFeishuSignature(secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const sign = crypto
    .createHmac("sha256", `${timestamp}\n${secret}`)
    .digest("base64")
  return { timestamp, sign }
}

async function sendFeishuMessage(payload: NotificationChannelConfig, text: string) {
  const body: Record<string, unknown> = {
    msg_type: "text",
    content: { text },
  }

  if (payload.secret) {
    const signed = buildFeishuSignature(payload.secret)
    body.timestamp = signed.timestamp
    body.sign = signed.sign
  }

  const response = await fetch(payload.webhookUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const data = (await response.json()) as { code?: number; msg?: string }
  if (typeof data.code === "number" && data.code !== 0) {
    throw new Error(data.msg || "飞书推送失败")
  }
}

export async function sendChannelMessage(
  type: string,
  configJson: string,
  text: string
) {
  const payload = parseChannelConfig(configJson)
  validateChannelPayload(type, payload)

  if (type === "telegram") {
    await sendTelegramMessage(payload, text)
    return
  }

  if (type === "feishu") {
    await sendFeishuMessage(payload, text)
    return
  }

  throw new Error("不支持的通知渠道")
}

export async function getUserDefaultReminderDays(userId: string) {
  const rules = await prisma.reminderRule.findMany({
    where: { userId, subscriptionId: null, enabled: true },
    orderBy: { daysBefore: "desc" },
    select: { daysBefore: true, enabled: true },
  })

  return resolveReminderDays([], rules)
}

export async function getDueSubscriptionCandidates(userId: string) {
  const [subscriptions, defaultRules, channelState] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId,
        decision: { notIn: ["renew", "skip"] },
      },
      include: {
        vaultItem: {
          select: {
            id: true,
            title: true,
            displayTitle: true,
          },
        },
        reminderRules: {
          where: { enabled: true },
          orderBy: { daysBefore: "desc" },
          select: {
            id: true,
            daysBefore: true,
            enabled: true,
          },
        },
      },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.reminderRule.findMany({
      where: { userId, subscriptionId: null, enabled: true },
      orderBy: { daysBefore: "desc" },
      select: { daysBefore: true, enabled: true },
    }),
    getResolvedNotificationChannels(userId),
  ])

  const channels = channelState.activeChannels

  const today = new Date()
  const dateKey = formatDateKey(today)

  const due = subscriptions.flatMap((subscription) => {
    const daysUntilExpiry = diffInDays(subscription.expiresAt, today)
    const computedStatus = deriveSubscriptionStatus(subscription.expiresAt, today)
    if (computedStatus === "expired" && daysUntilExpiry < -3) {
      return []
    }
    const reminderDays = resolveReminderDays(subscription.reminderRules, defaultRules)
    if (!reminderDays.includes(daysUntilExpiry)) {
      return []
    }

    return [
      {
        subscription,
        daysUntilExpiry,
        triggerDateKey: dateKey,
        channels,
      },
    ]
  })

  return due
}
