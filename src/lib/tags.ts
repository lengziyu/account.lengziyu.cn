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
  "Apple",
  "Github",
  "Google",
  "ChatGPT",
  "知乎",
  "淘宝",
  "京东",
  "咸鱼",
] as const

export function sanitizeItemTags(tags: string[]): string[] {
  return dedupeTags(tags)
}

export function getTagSections() {
  return [{ label: "常用平台", tags: [...DEFAULT_TAGS] }]
}
