import { defineEventHandler, getQuery } from 'h3'
import { extractTelemetry } from '~/server/utils/telemetry'

// Base64 encoded 1x1 transparent GIF
const TRANSPARENT_PIXEL = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64')

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const campaignId = query.c as string
  const recipientId = query.r as string

  // Set headers immediately to prevent caching by the browser/proxy
  event.res.headers.set('Content-Type', 'image/gif')
  event.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  event.res.headers.set('Pragma', 'no-cache')

  if (campaignId && recipientId) {
    const telemetry = extractTelemetry(event)

    if (telemetry.isBot) {
      // Option A: Ignore entirely.
      // Option B: Log it in a separate "bot_opens" table so you can analyze scanner behavior.
      console.log(`[BOT FILTERED] Open by ${telemetry.isBot} for Recipient ${recipientId}`)
    } else {
      // 🚀 Log true human open to your database
      // await db.emailOpens.insert({ campaignId, recipientId, ...telemetry })
      console.log(`[REAL OPEN] Recipient ${recipientId} opened on ${telemetry.deviceType}`)
    }
  }

  // Always return the pixel so the email client doesn't show a broken image icon
  return TRANSPARENT_PIXEL
})
