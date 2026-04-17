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

export const SITE_TAGS = [
  "QQ",
  "微信",
  "Apple",
  "Github",
  "Google",
  "ChatGPT",
  "知乎",
  "淘宝",
  "京东",
  "咸鱼",
] as const

const SITE_TAG_ALIASES: Record<string, (typeof SITE_TAGS)[number]> = {
  qq: "QQ",
  微信: "微信",
  wechat: "微信",
  apple: "Apple",
  github: "Github",
  gitHub: "Github",
  GitHub: "Github",
  google: "Google",
  chatgpt: "ChatGPT",
  知乎: "知乎",
  zhihu: "知乎",
  淘宝: "淘宝",
  taobao: "淘宝",
  京东: "京东",
  jd: "京东",
  咸鱼: "咸鱼",
  闲鱼: "咸鱼",
  xianyu: "咸鱼",
}

export function sanitizeSiteTags(tags: string[]): string[] {
  const normalized = dedupeTags(tags)
  const result: string[] = []

  for (const raw of normalized) {
    const key = raw.trim()
    const siteTag =
      SITE_TAG_ALIASES[key] ||
      SITE_TAG_ALIASES[key.toLowerCase()] ||
      (SITE_TAGS.includes(key as (typeof SITE_TAGS)[number])
        ? (key as (typeof SITE_TAGS)[number])
        : undefined)
    if (!siteTag) continue
    if (!result.includes(siteTag)) {
      result.push(siteTag)
    }
  }

  return result
}

export function getTagSections() {
  return [{ label: "常用平台", tags: [...SITE_TAGS] }]
}
