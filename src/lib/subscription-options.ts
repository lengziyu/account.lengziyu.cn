export const REMINDER_DAY_PRESETS = [30, 14, 7, 3, 1, 0]

export const DEFAULT_REMINDER_DAYS = [7, 3, 1, 0]

export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "expiring", label: "即将到期" },
  { value: "expired", label: "已过期" },
]

export const SUBSCRIPTION_DECISION_OPTIONS = [
  { value: "pending", label: "待决定" },
  { value: "renew", label: "准备续费" },
  { value: "skip", label: "不再续费" },
  { value: "snoozed", label: "稍后提醒" },
]

export const RENEWAL_CYCLE_OPTIONS = [
  { value: "monthly", label: "月付" },
  { value: "quarterly", label: "季付" },
  { value: "yearly", label: "年付" },
  { value: "lifetime", label: "买断" },
  { value: "custom", label: "自定义" },
]

export const NOTIFICATION_CHANNEL_OPTIONS = [
  { value: "telegram", label: "Telegram" },
  { value: "feishu", label: "飞书" },
]

export const COMMON_CURRENCY_OPTIONS = [
  { value: "CNY", label: "人民币 CNY" },
  { value: "USD", label: "美元 USD" },
  { value: "HKD", label: "港币 HKD" },
  { value: "JPY", label: "日元 JPY" },
  { value: "EUR", label: "欧元 EUR" },
  { value: "GBP", label: "英镑 GBP" },
  { value: "SGD", label: "新加坡元 SGD" },
]

export function normalizeReminderDays(values: number[]) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 365)
    )
  ).sort((a, b) => b - a)
}

export function formatReminderLabel(day: number) {
  return day === 0 ? "当天" : `提前 ${day} 天`
}

export function deriveSubscriptionStatus(expiresAt: Date, now = new Date()) {
  const dayMs = 24 * 60 * 60 * 1000
  const expiresDay = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate()).getTime()
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diff = Math.floor((expiresDay - currentDay) / dayMs)

  if (diff < 0) return "expired"
  if (diff <= 7) return "expiring"
  return "active"
}
