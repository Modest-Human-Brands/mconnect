import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import notion from '#server/utils/notion.ts'
import notionNormalizeId from '#server/utils/notion-normalize-id.ts'
import notionQueryDb from '#server/utils/notion-query-db.ts'
import type { ResourceType, NotionDB, ResourceRecordMap, Resource } from '~/server/types'

type ResourceQueries = {
  [K in ResourceType]: ResourceRecordMap[K][]
}

// server/utils/notion-rate-limit.ts
type Task<T> = () => Promise<T>

class NotionLimiter {
  private queue: Array<() => void> = []
  private active = 0
  private lastStart = 0

  constructor(
    private maxConcurrent = 3,
    private minIntervalMs = 350 // ~3 req/s ceiling across the whole task
  ) {}

  private next() {
    if (this.active >= this.maxConcurrent) return
    const job = this.queue.shift()
    if (!job) return
    this.active++
    job()
  }

  async run<T>(task: Task<T>, retries = 4): Promise<T> {
    await new Promise<void>((resolve) => {
      const start = () => {
        const wait = Math.max(0, this.minIntervalMs - (Date.now() - this.lastStart))
        setTimeout(() => {
          this.lastStart = Date.now()
          resolve()
        }, wait)
      }
      this.queue.push(start)
      this.next()
    })

    try {
      return await task()
    } catch (error_: any) {
      const isRateLimited = error_?.status === 429 || error_?.code === 'rate_limited'
      if (isRateLimited && retries > 0) {
        const retryAfter = Number(error_?.headers?.['retry-after']) || 1
        await new Promise((r) => setTimeout(r, retryAfter * 1000))
        return this.run(task, retries - 1)
      }
      throw error_
    } finally {
      this.active--
      this.next()
    }
  }
}

// Single shared instance for the whole process/task run
export const notionLimiter = new NotionLimiter(3, 350)

export default defineTask({
  meta: {
    name: 'sync:resource',
    description: 'Sync Notion Resources into cache',
  },
  async run() {
    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const dbTypes = ['contact', 'user', 'email', 'message', 'call'] as const
    const queryResults = await Promise.allSettled(dbTypes.map((type) => notionLimiter.run(() => notionQueryDb(notion, notionDbId[type]))))

    const resources: Partial<Pick<ResourceQueries, 'contact' | 'user' | 'message' | 'call' | 'email'>> = {}
    for (const [idx, type] of dbTypes.entries()) {
      const res = queryResults[idx]
      if (res.status === 'fulfilled') {
        resources[type] = (res.value as any[]).filter((a) => !!a)
      } else {
        console.warn(`Notion fetch failed for ${type}:`, res.reason)
      }
    }

    for (const type of dbTypes) {
      const records = resources[type]
      if (!records) continue

      const resourceStorage = useStorage<Resource>(`data:resource:${type}`)

      // Process records with limited concurrency instead of all at once
      await Promise.allSettled(
        records.map((record) =>
          notionLimiter.run(async () => {
            if (typeof record === 'string') return

            const resource = ((await resourceStorage.getItem(notionNormalizeId(record.id))) as Resource & { htmlContent?: string }) ?? {
              type,
              notificationStatus: false,
              record,
            }

            resource.record = record

            if (type === 'email') {
              let contentHtml = ''
              try {
                const blocksResponse = await notionLimiter.run(() => notion.blocks.children.list({ block_id: record.id }))
                for (const block of blocksResponse.results as any[]) {
                  if (block.type === 'code') {
                    contentHtml += block.code.rich_text.map((t: any) => t.plain_text).join('')
                  } else if (block.type === 'paragraph') {
                    contentHtml += block.paragraph.rich_text.map((t: any) => t.plain_text).join('')
                  }
                }
              } catch (error_) {
                console.error(`Failed to fetch blocks for email ${record.id}`, error_)
              }
              resource.htmlContent = contentHtml
            }

            await resourceStorage.setItem(notionNormalizeId(record.id), resource)
          })
        )
      )
    }

    return { result: 'success' }
  },
})
