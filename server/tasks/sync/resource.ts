import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import notion from '#server/utils/notion.ts'
import notionNormalizeId from '#server/utils/notion-normalize-id.ts'
import notionQueryDb from '#server/utils/notion-query-db.ts'
import type { ResourceType, NotionDB, NotionContact, ResourceRecordMap, Resource, NotionUser, NotionCall, NotionMessage, NotionEmail } from '~/server/types'

type ResourceQueries = {
  [K in ResourceType]: ResourceRecordMap[K][]
}

export default defineTask({
  meta: {
    name: 'sync:resource',
    description: 'Sync Notion Resources into cache',
  },
  async run() {
    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB
    const resources: Pick<ResourceQueries, 'contact' | 'user' | 'message' | 'call' | 'email'> = {
      contact: (await notionQueryDb<NotionContact>(notion, notionDbId.contact)).filter((a) => !!a),
      user: (await notionQueryDb<NotionUser>(notion, notionDbId.user)).filter((a) => !!a),
      email: (await notionQueryDb<NotionEmail>(notion, notionDbId.email)).filter((a) => !!a),
      message: (await notionQueryDb<NotionMessage>(notion, notionDbId.message)).filter((a) => !!a),
      call: (await notionQueryDb<NotionCall>(notion, notionDbId.call)).filter((a) => !!a),
    }
    const results = await Promise.allSettled(Object.values(resources))

    for (const [idx, res] of results.entries()) {
      const type = Object.keys(resources)[idx] as keyof typeof resources
      const resourceStorage = useStorage<Resource>(`data:resource:${type}`)

      if (res.status === 'fulfilled')
        await Promise.allSettled(
          res.value.map(async (record) => {
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
                const blocksResponse = await notion.blocks.children.list({ block_id: record.id })
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
      else console.warn(`Notion fetch failed for ${type}:`, res.reason)
    }

    return { result: 'success' }
  },
})
