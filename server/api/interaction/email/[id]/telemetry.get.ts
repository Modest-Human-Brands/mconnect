import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import type { TelemetryRecord } from '~/server/types/telemetry'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw new HTTPError({
      statusCode: 400,
      statusMessage: 'Email ID parameter is required',
    })
  }

  try {
    const telemetryStorage = useStorage<TelemetryRecord>('data:telemetry')
    const allKeys = await telemetryStorage.getKeys(id)

    // Match exact prefix `${emailId}:` to prevent collision with similar ID substrings
    const targetKeys = allKeys.filter((k) => k.startsWith(`${id}:`))

    const rawItems = await telemetryStorage.getItems(targetKeys)
    const records = rawItems
      .map(({ value }) => value)
      .filter((record): record is TelemetryRecord => Boolean(record && record.emailId === id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Aggregations breakdown
    let totalOpens = 0
    let totalClicks = 0
    let botFiltered = 0
    let isHoneypotTriggered = false

    const deviceBreakdown = { desktop: 0, mobile: 0, unknown: 0 }
    const topUrls: Record<string, number> = {}
    const locationSet = new Set<string>()

    for (const record of records) {
      if (record.type === 'trap' || record.invalidatedReason === 'honeypot_trap') {
        isHoneypotTriggered = true
      }

      if (!record.isValid || record.isBot) {
        botFiltered++
        continue
      }

      if (record.type === 'open') {
        totalOpens++
      } else if (record.type === 'click') {
        totalClicks++
        if (record.targetUrl) {
          topUrls[record.targetUrl] = (topUrls[record.targetUrl] || 0) + 1
        }
      }

      const dev = record.deviceType || 'unknown'
      deviceBreakdown[dev] = (deviceBreakdown[dev] || 0) + 1

      const loc = [record.location?.city, record.location?.country].filter(Boolean).join(', ')
      if (loc) locationSet.add(loc)
    }

    // Formatted chronological event timeline (newest to oldest)
    const timeline = records.map((record) => {
      const loc = [record.location?.city, record.location?.country].filter(Boolean).join(', ') || null
      let category: 'human' | 'bot' | 'trap' | 'invalidated' = 'human'
      let title = ''
      let description = ''

      if (record.type === 'trap') {
        category = 'trap'
        title = 'Honeypot Link Triggered'
        description = 'Invisible trap link was accessed. Recipient email flagged as scanned.'
      } else if (record.invalidatedReason === 'honeypot_trap') {
        category = 'invalidated'
        title = `Invalidated ${record.type.toUpperCase()}`
        description = 'Retroactively marked invalid after honeypot trap was triggered.'
      } else if (record.isBot || !record.isValid) {
        category = 'bot'
        title = `Bot Scanner ${record.type === 'open' ? 'Prefetch' : 'Click'}`
        description = `Identified as security scanner (${record.isBot || 'automated agent'}).`
      } else if (record.type === 'click') {
        category = 'human'
        title = 'Link Clicked'
        description = record.targetUrl ? `Clicked: ${record.targetUrl}` : 'Clicked tracked CTA'
      } else {
        category = 'human'
        title = 'Email Opened'
        description = `Opened via tracking pixel on ${record.deviceType || 'desktop'}.`
      }

      return {
        id: record.id,
        type: record.type,
        category,
        title,
        description,
        timestamp: new Date(record.timestamp).toISOString(),
        targetUrl: record.targetUrl,
        deviceType: record.deviceType || 'unknown',
        location: loc,
        ip: record.ip || 'unknown',
        userAgent: record.userAgent,
        isValid: record.isValid,
        isBot: record.isBot,
        invalidatedReason: record.invalidatedReason,
      }
    })

    return {
      emailId: id,
      aggregated: {
        totalOpens,
        totalClicks,
        botFiltered,
        isHoneypotTriggered,
        deviceBreakdown,
        topUrls,
        locations: [...locationSet],
        firstActivity: records.at(-1)?.timestamp ? new Date(records.at(-1)!.timestamp).toISOString() : null,
        lastActivity: records[0]?.timestamp ? new Date(records[0].timestamp).toISOString() : null,
      },
      timeline,
    }
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error(`API interaction/email/${id}/telemetry GET error:`, error)
    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to fetch email telemetry',
    })
  }
})
