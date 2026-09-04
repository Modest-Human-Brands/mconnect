import { defineEventHandler, getQuery, redirect } from 'h3'
import { extractTelemetry } from '~/server/utils/telemetry'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url as string
  const campaignId = query.c as string
  const recipientId = query.r as string

  const FALLBACK_URL = 'https://modesthumanbrands.com'
  const destination = targetUrl ? decodeURIComponent(targetUrl) : FALLBACK_URL

  if (campaignId && recipientId && targetUrl) {
    const telemetry = extractTelemetry(event)

    if (telemetry.isBot) {
      console.log(`[BOT FILTERED] Click scanner detected: ${telemetry.isBot}`)
    } else {
      console.log(`[REAL CLICK] Recipient ${recipientId} clicked to ${destination}`)
    }
  }

  return redirect(destination, 302)
})
