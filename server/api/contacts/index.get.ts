import { defineEventHandler, getValidatedQuery, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import type { Resource } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'

const queryParamsSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, queryParamsSchema)

    const limit = query.limit ? Number(query.limit) : 50
    const offset = query.offset ? Number(query.offset) : 0

    const contactStorage = useStorage<Resource<'contact'>>('data:resource:contact')
    const contacts = (await contactStorage.getItems(await contactStorage.getKeys())).flatMap(({ value }) => value?.record || [])

    const emailStorage = useStorage<Resource<'email'>>('data:resource:email')
    const emails = (await emailStorage.getItems(await emailStorage.getKeys())).flatMap(({ value }) => value?.record || [])

    const messageStorage = useStorage<Resource<'message'>>('data:resource:message')
    const messages = (await messageStorage.getItems(await messageStorage.getKeys())).flatMap(({ value }) => value?.record || [])

    const callStorage = useStorage<Resource<'call'>>('data:resource:call')
    const calls = (await callStorage.getItems(await callStorage.getKeys())).flatMap(({ value }) => value?.record || [])

    const interactionMap = new Map<string, { interactions: { time: number; snippet: string }[]; unreadCount: number }>()

    const addInteraction = (relations: { id: string }[] | undefined, time: number, snippet: string, direction: string, isRead: boolean) => {
      if (!relations) return
      for (const { id: contactId } of relations) {
        if (!interactionMap.has(contactId)) {
          interactionMap.set(contactId, { interactions: [], unreadCount: 0 })
        }

        const contactData = interactionMap.get(contactId)!
        contactData.interactions.push({ time, snippet })

        if (direction.toLowerCase() === 'inbound' && !isRead) {
          contactData.unreadCount++
        }
      }
    }

    for (const e of emails) {
      const time = new Date(e.properties.Timestamp?.date?.start || e.created_time).getTime()
      const snippet = notionTextStringify(e.properties.Content?.rich_text) || notionTextStringify(e.properties.Title?.title) || 'Email interaction'
      const direction = e.properties.Direction?.select?.name || 'outbound'
      const isRead = e.properties['Is Read']?.checkbox || false

      addInteraction(e.properties.Contact?.relation, time, snippet, direction, isRead)
    }

    for (const m of messages) {
      const time = new Date(m.properties.Timestamp?.date?.start || m.created_time).getTime()
      const snippet = notionTextStringify(m.properties.Content?.rich_text) || notionTextStringify(m.properties.Title?.title) || 'Message interaction'
      const direction = m.properties.Direction?.select?.name || 'outbound'
      const isRead = m.properties['Is Read']?.checkbox || false

      addInteraction(m.properties.Contact?.relation, time, snippet, direction, isRead)
    }

    for (const c of calls) {
      const time = new Date(c.properties.Timestamp?.date?.start || c.created_time).getTime()
      const snippet = notionTextStringify(c.properties.Title?.title) || 'Call interaction'
      const direction = c.properties.Direction?.select?.name || 'outbound'
      const isRead = c.properties['Is Read']?.checkbox || false

      addInteraction(c.properties.Contact?.relation, time, snippet, direction, isRead)
    }

    const total = contacts.length
    const paginatedContent = contacts.slice(offset, offset + limit)

    const results = paginatedContent.map(({ id, properties: props, last_edited_time }) => {
      const email = props['Email'].email || null
      const phone = props['Phone'].phone_number || null
      const whatsapp = props['Whatsapp'].phone_number || null
      const instagram = notionTextStringify(props['Username']?.rich_text) || null

      const platforms: string[] = []
      if (email) platforms.push('email')
      if (whatsapp) platforms.push('whatsapp')
      if (instagram) platforms.push('instagram')
      if (phone) platforms.push('sms', 'phone')

      const contactData = interactionMap.get(id) || { interactions: [], unreadCount: 0 }
      contactData.interactions.sort((a, b) => b.time - a.time)
      const latest = contactData.interactions[0]

      return {
        id,
        name: notionTextStringify(props['Name']?.title) || 'Unknown Contact',
        company: notionTextStringify(props['Company']?.rich_text) || null,
        jobTitle: notionTextStringify(props['Job Title']?.rich_text) || null,
        email,
        phone,
        instagram,
        status: props['Status']?.select?.name || 'Active',
        lastActive: latest ? new Date(latest.time).toISOString() : last_edited_time,
        lastMessageSnippet: latest ? latest.snippet : 'No recent messages.',
        platforms: [...new Set(platforms)],
        unreadCount: contactData.unreadCount,
      }
    })

    return {
      results,
      pagination: {
        total,
        limit,
        offset,
      },
    }
  } catch (error: unknown) {
    console.error('API contacts GET', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to fetch contact queue',
    })
  }
})
