import { useRuntimeConfig } from 'nitro/runtime-config'

/** Headers for the service calling its own protected API (see server/middleware/api-key.ts). */
export default function () {
  return { 'x-api-key': useRuntimeConfig().private.apiKey as string }
}
