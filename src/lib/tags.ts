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

type SystemTagInput = {
  category?: string | null
  favorite?: boolean
  password?: string | null
  loginValue?: string | null
  title?: string | null
  serviceName?: string | null
  serviceDomain?: string | null
  identityId?: string | null
}

export function computeSystemTags(input: SystemTagInput): string[] {
  const tags = new Set<string>()
  const category = (input.category || "").toLowerCase()
  const loginValue = (input.loginValue || input.title || "").trim()
  const serviceHints = `${input.serviceName || ""} ${input.serviceDomain || ""}`.toLowerCase()

  if (input.identityId) tags.add("已关联主账号")
  if (input.favorite) tags.add("常用")
  if (!input.password) tags.add("免密记录")
  if (/@/.test(loginValue)) tags.add("邮箱登录")
  if (/^\d{6,}$/.test(loginValue)) tags.add("数字ID")

  if (category === "social") tags.add("社交")
  if (category === "website") tags.add("网站")
  if (category === "finance") tags.add("金融")
  if (category === "dev") tags.add("开发")

  if (/(github|gitlab|vercel|npm)/.test(serviceHints)) tags.add("开发平台")
  if (/(apple|icloud|app store)/.test(serviceHints)) tags.add("Apple生态")
  if (/(qq|wechat|weixin|wx|x|twitter)/.test(serviceHints)) tags.add("社交账号")

  return Array.from(tags)
}

export function getDefaultCustomTagSections() {
  return [
    {
      label: "常用标签",
      tags: ["QQ", "微信", "Github", "Apple", "工作", "支付", "社交", "开发"],
    },
    {
      label: "系统标签",
      tags: ["已关联主账号", "常用", "免密记录", "邮箱登录", "开发平台"],
    },
  ]
}
