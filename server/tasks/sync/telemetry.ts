import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import { isNotionClientError } from '@notionhq/client'
import notion from '#server/utils/notion.ts'
import type { NotionDB } from '#server/types/index.ts'
import { useRuntimeConfig } from 'nitro/runtime-config'
import type { TelemetryRecord } from '#server/types/telemetry.ts'

export default defineTask({
  meta: {
    name: 'sync:telemetry',
    description: 'Syncs verified telemetry opens and clicks to Notion',
  },
  async run() {
    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const storage = useStorage<TelemetryRecord>('data:telemetry')
    const keys = await storage.getKeys()

    let processedCount = 0
    let skippedCount = 0

    for (const key of keys) {
      const record = await storage.getItem(key)

      // Filter: genuine human opens and clicks only
      if (!record || !record.isValid || record.isBot || record.type === 'trap' || record.syncedAt) {
        skippedCount++
        continue
      }

      // Format location display
      const locParts = [record.location?.city, record.location?.country].filter(Boolean)
      const locationText = locParts.length > 0 ? locParts.join(', ') : 'Unknown'

      // Parse timestamp to ISO-8601
      const isoDate = new Date(record.timestamp).toISOString()

      // Construct Notion Page properties
      const properties: Record<string, any> = {
        'Event Name': {
          title: [{ text: { content: `${record.type.toUpperCase()} - ${record.emailId}` } }],
        },
        'Event Type': {
          select: { name: record.type },
        },
        Email: {
          relation: [{ id: record.emailId }],
        },
        Device: {
          select: { name: record.deviceType || 'unknown' },
        },
        Location: {
          rich_text: [{ text: { content: locationText } }],
        },
        'IP Address': {
          rich_text: [{ text: { content: record.ip || 'unknown' } }],
        },
        Timestamp: {
          date: { start: isoDate },
        },
      }

      if (record.type === 'click' && record.targetUrl) {
        properties['Target URL'] = {
          url: record.targetUrl,
        }
      }

      try {
        await notion.pages.create({
          parent: { database_id: notionDbId.telemetry },
          properties,
        })

        // Mark as synced to prevent duplicate delivery
        record.syncedAt = new Date().toISOString()
        await storage.setItem(key, record)
        processedCount++
      } catch (error_) {
        if (isNotionClientError(error_)) {
          console.error(`[NOTION SYNC FAILED] ${key}: [${error_.code}] ${error_.message}`)
        } else {
          console.error(`[NOTION SYNC ERROR] Network error syncing ${key}:`, error_)
        }
      }
    }

    return {
      result: 'SUCCESS',
      synced: processedCount,
      ignored: skippedCount,
    }
  },
})
