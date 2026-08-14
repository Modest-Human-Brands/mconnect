import { defineEventHandler, getQuery, redirect } from 'h3'
import { extractTelemetry } from '~/server/utils/telemetry'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url as string
  const campaignId = query.c as string
  const recipientId = query.r as string

  // Fallback URL if someone messes with the tracking link
  const FALLBACK_URL = 'https://modesthumanbrands.com'
  const destination = targetUrl ? decodeURIComponent(targetUrl) : FALLBACK_URL

  if (campaignId && recipientId && targetUrl) {
    const telemetry = extractTelemetry(event)

    if (telemetry.isBot) {
      console.log(`[BOT FILTERED] Click scanner detected: ${telemetry.isBot}`)
    } else {
      // 🚀 Log true human click to your database
      // await db.emailClicks.insert({ campaignId, recipientId, url: destination, ...telemetry })
      console.log(`[REAL CLICK] Recipient ${recipientId} clicked to ${destination}`)
    }
  }

  // Issue a 302 Temporary Redirect to the destination
  return redirect(destination, 302)
})
