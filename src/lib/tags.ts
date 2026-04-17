export function normalizeTag(input: string): string {
  return input.trim().replace(/\s+/g, " ")
}

export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of tags) {
    const normalized = normalizeTag(raw)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }

  return result
}

export const DEFAULT_TAGS = [
  "QQ",
  "微信",
  "企业微信",
  "钉钉",
  "飞书",
  "支付宝",
  "Apple",
  "Microsoft",
  "Gmail",
  "Outlook",
  "Telegram",
  "WhatsApp",
  "Discord",
  "Facebook",
  "Instagram",
  "X",
  "LinkedIn",
  "YouTube",
  "Netflix",
  "Github",
  "GitLab",
  "Bitbucket",
  "Notion",
  "Figma",
  "Slack",
  "Zoom",
  "AWS",
  "PayPal",
  "Spotify",
  "OpenAI",
  "Claude",
  "Google",
  "百度",
  "百度网盘",
  "ChatGPT",
  "知乎",
  "微博",
  "小红书",
  "抖音",
  "快手",
  "B站",
  "豆瓣",
  "淘宝",
  "天猫",
  "京东",
  "拼多多",
  "咸鱼",
  "美团",
  "饿了么",
  "携程",
  "12306",
  "滴滴",
  "腾讯视频",
  "爱奇艺",
  "优酷",
  "网易云音乐",
  "QQ音乐",
] as const

export function sanitizeItemTags(tags: string[]): string[] {
  return dedupeTags(tags)
}

export function getTagSections() {
  return [{ label: "常用平台", tags: [...DEFAULT_TAGS] }]
}
