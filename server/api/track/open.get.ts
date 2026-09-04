import { defineEventHandler, getQuery } from 'h3'
import { useStorage } from 'nitro/storage'
import { extractTelemetry } from '#server/utils/telemetry.ts'
import type { TelemetryRecord } from '#server/types/telemetry.ts'

const TRANSPARENT_PIXEL = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64')

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const emailId = query.e as string

  event.res.headers.set('Content-Type', 'image/gif')
  event.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  event.res.headers.set('Pragma', 'no-cache')

  const referer = event.req.headers.get('referer') || ''
  const isDashboardView = referer.includes('localhost:') || referer.includes('modesthumanbrands.com')

  if (isDashboardView) {
    return TRANSPARENT_PIXEL
  }

  if (emailId) {
    const telemetry = extractTelemetry(event)
    const telemetryStorage = useStorage<TelemetryRecord>('data:telemetry')
    const eventId = `${emailId}:open:${Date.now()}`

    if (telemetry.isBot) {
      console.log(`[BOT FILTERED] Open by ${telemetry.isBot} for Email ${emailId}`)
    } else {
      console.log(`[REAL OPEN] Email ${emailId} opened on ${telemetry.deviceType}`)
    }

    await telemetryStorage.setItem(eventId, {
      id: eventId,
      type: 'open',
      emailId,
      ...telemetry,
      isValid: !telemetry.isBot,
    })
  }

  return TRANSPARENT_PIXEL
})
