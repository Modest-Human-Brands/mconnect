import { defineEventHandler, getQuery, redirect } from 'h3'
import { useStorage } from 'nitro/storage'
import { extractTelemetry } from '#server/utils/telemetry.ts'
import type { TelemetryRecord } from '#server/types/telemetry.ts'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url as string
  const emailId = query.e as string

  const FALLBACK_URL = 'https://modesthumanbrands.com'
  const destination = targetUrl ? decodeURIComponent(targetUrl) : FALLBACK_URL

  if (emailId && targetUrl) {
    const telemetry = extractTelemetry(event)
    const telemetryStorage = useStorage<TelemetryRecord>('data:telemetry')
    const eventId = `${emailId}:click:${Date.now()}`

    if (telemetry.isBot) {
      console.log(`[BOT FILTERED] Click scanner detected: ${telemetry.isBot}`)
    } else {
      console.log(`[REAL CLICK] Email ${emailId} clicked to ${destination}`)
    }

    await telemetryStorage.setItem(eventId, {
      id: eventId,
      type: 'click',
      emailId,
      targetUrl: destination,
      ...telemetry,
      isValid: !telemetry.isBot,
    })
  }

  return redirect(destination, 302)
})
