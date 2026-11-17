import { useRuntimeConfig } from 'nitro/runtime-config'

/**
 * Headers for the service calling its own protected API (see server/middleware/api-key.ts): the API key,
 * the organization the work is for, and the `system` identity in place of a user.
 */
export default function (orgSlug: string) {
  return { 'x-api-key': useRuntimeConfig().private.apiKey as string, 'x-org-id': orgSlug, 'x-user-id': 'system' }
}
