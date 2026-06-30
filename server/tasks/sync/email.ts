import { defineTask } from 'nitro/task'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { $fetch } from 'ofetch'

import notion from '~/server/utils/notion'
import notionQueryDb from '~/server/utils/notion-query-db'
import type { NotionDB } from '~/server/types'

interface HostingerEnrichedMessage {
  id: string
  uid: number
  path: string
  subject: string
  from: { name: string; address: string }
  date: string
  bodyText: {
    plain: string
    html: string
  }
}

export default defineTask({
  meta: {
    name: 'email:import-hostinger',
    description: 'Reads response.json and syncs the contents to Notion DB 5.',
  },
  async run() {
    console.log('[Import Task]: Starting Hostinger email import...')

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    try {
      const filePath = path.resolve('./server/tasks/sync/request-1.json')

      let fileContent: string
      try {
        fileContent = await fs.readFile(filePath, 'utf8')
      } catch {
        console.error('[Import Task Error]: Could not find "response.json" in the project root.')
        return { result: 'error', message: 'Missing response.json file.' }
      }

      const messages: HostingerEnrichedMessage[] = JSON.parse(fileContent)
      let syncedCount = 0

      console.log(`[Import Task]: Found ${messages.length} messages to process.`)

      for (const msg of messages) {
        const emailDateIso = new Date(msg.date).toISOString()

        const existingEntries = await notionQueryDb(notion, notionDbId.email, {
          filter: {
            and: [
              { property: 'Subject', title: { equals: msg.subject || 'No Subject' } },
              { property: 'Sent At', date: { equals: emailDateIso } },
            ],
          },
        })

        if (existingEntries.length > 0) {
          console.log(`[Import Task]: Skipping "${msg.subject}" (Already in Notion)`)
          continue
        }

        const snippetText = msg.bodyText?.plain || msg.bodyText?.html || 'No body content available.'
        const pocPerson = msg.from.name || msg.from.address.split('@')[0]

        console.log(
          JSON.stringify(
            {
              brand: 'Unknown',
              company: 'Unknown',
              email: msg.from.address.toLowerCase().trim(),
              address: 'Unknown',
              pocPerson,
              status: 'Active',
            },
            null,
            2
          )
        )
        const { contactId } = await $fetch<{ contactId: string }>('/api/contacts', {
          baseURL: config.public.connectUrl,
          method: 'PUT',
          body: {
            brand: 'Unknown',
            company: 'Unknown',
            email: msg.from.address.toLowerCase().trim(),
            address: 'Unknown',
            pocPerson,
            status: 'Active',
          },
        })

        await notion.pages.create({
          parent: { data_source_id: notionDbId.email },
          properties: {
            Subject: {
              title: [{ text: { content: msg.subject || 'No Subject' } }],
            },
            'Body Snippet': {
              rich_text: [{ text: { content: snippetText.slice(0, 2000) } }], // Prevent Notion 2k char limit crash
            },
            Status: {
              select: { name: 'SENT' },
            },
            'Sent At': {
              date: { start: emailDateIso },
            },
            Contact: {
              relation: [{ id: contactId }],
            },
          },
        })

        syncedCount++
        console.log(`[Import Task]: ✅ Synced "${msg.subject}"`)
      }

      console.log(`[Import Task]: Completed. Successfully synced ${syncedCount} new emails.`)
      return { result: 'success', syncedCount }
    } catch (error: any) {
      console.error('[Import Task Error]:', error.message || error)
      return { result: 'error', error: error.message }
    }
  },
})
