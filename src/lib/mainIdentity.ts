export const MAIN_IDENTITY_KIND = "item_main"
export const MAIN_IDENTITY_PROVIDER_PREFIX = "vault-item:"

export function buildMainIdentityProvider(itemId: string): string {
  return `${MAIN_IDENTITY_PROVIDER_PREFIX}${itemId}`
}
