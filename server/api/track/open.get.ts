import { defineEventHandler, getQuery } from 'h3'
import { extractTelemetry } from '~/server/utils/telemetry'

const TRANSPARENT_PIXEL = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64')

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const campaignId = query.c as string
  const recipientId = query.r as string

  event.res.headers.set('Content-Type', 'image/gif')
  event.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  event.res.headers.set('Pragma', 'no-cache')

  if (campaignId && recipientId) {
    const telemetry = extractTelemetry(event)

    if (telemetry.isBot) {
      console.log(`[BOT FILTERED] Open by ${telemetry.isBot} for Recipient ${recipientId}`)
    } else {
      console.log(`[REAL OPEN] Recipient ${recipientId} opened on ${telemetry.deviceType}`)
    }
  }

  return TRANSPARENT_PIXEL
})
