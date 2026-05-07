export const MAIN_IDENTITY_KIND = "item_main"
export const MAIN_IDENTITY_PROVIDER_PREFIX = "vault-item:"

export function buildMainIdentityProvider(itemId: string): string {
  return `${MAIN_IDENTITY_PROVIDER_PREFIX}${itemId}`
}

export function getItemIdFromMainIdentityProvider(
  provider?: string | null
): string | null {
  if (!provider?.startsWith(MAIN_IDENTITY_PROVIDER_PREFIX)) {
    return null
  }

  const itemId = provider.slice(MAIN_IDENTITY_PROVIDER_PREFIX.length).trim()
  return itemId || null
}
