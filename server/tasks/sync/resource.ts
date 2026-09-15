import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import pThrottle from 'p-throttle'
import pRetry, { AbortError } from 'p-retry'

import notion from '#server/utils/notion.ts'
import notionQueryDb from '#server/utils/notion-query-db.ts'
import type { ResourceType, NotionDB, ResourceRecordMap, Resource } from '~/server/types'

type ResourceQueries = {
  [K in ResourceType]: ResourceRecordMap[K][]
}

const throttle = pThrottle({
  limit: 3,
  interval: 1000,
})

export const throttledNotion = throttle((task: () => Promise) =>
  pRetry(task, {
    retries: 4,
    onFailedAttempt: (error: any) => {
      const isRateLimited = error?.status === 429 || error?.code === 'rate_limited'
      if (!isRateLimited) throw new AbortError(error)
    },
  })
) as (task: () => Promise) => Promise

export default defineTask({
  meta: {
    name: 'sync:resource',
    description: 'Sync Notion Resources into cache',
  },
  async run() {
    const startTime = Date.now()
    console.info('[sync:resource] Starting resource synchronization...')

    const config = useRuntimeConfig()
    const rawDbId = config.private.notionDbId
    const notionDbId = (typeof rawDbId === 'string' ? JSON.parse(rawDbId) : rawDbId) as unknown as NotionDB

    const dbTypes = ['contact', 'user', 'email', 'message', 'call'] as const
    const queryResults = await Promise.allSettled(dbTypes.map((type) => throttledNotion(() => notionQueryDb(notion, notionDbId[type]))))

    const resources: Partial<Record<ResourceType, ResourceRecordMap[keyof NotionDB]>> = {}
    for (const [idx, type] of dbTypes.entries()) {
      const res = queryResults[idx]
      if (res.status === 'fulfilled') {
        const items = (res.value as any[]).filter(Boolean)
        resources[type] = items
      }
    }

    for (const type of dbTypes) {
      const records = resources[type]
      if (!records || records.length === 0) continue

      const resourceStorage = useStorage(`data:resource:${type}`)

      const settled = await Promise.allSettled(
        records.map(async (record) => {
          if (typeof record === 'string' || !record?.id) {
            return
          }

          const resource = ((await resourceStorage.getItem(record.id)) as Resource & { htmlContent?: string }) ?? {
            type,
            notificationStatus: false,
            record,
          }

          resource.record = record

          if (type === 'email') {
            let contentHtml = ''
            try {
              const blocksResponse = await throttledNotion(() => notion.blocks.children.list({ block_id: record.id }))
              for (const block of blocksResponse.results as any[]) {
                if (block.type === 'code') {
                  contentHtml += block.code.rich_text.map((t: any) => t.plain_text).join('')
                } else if (block.type === 'paragraph') {
                  contentHtml += block.paragraph.rich_text.map((t: any) => t.plain_text).join('')
                }
              }
            } catch {
              /* empty */
            }
            resource.htmlContent = contentHtml
          }

          await resourceStorage.setItem(record.id, resource)
        })
      )
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.info(`[sync:resource] Completed synchronization in ${duration}s`)
    return { result: 'success', duration: `${duration}s` }
  },
})
