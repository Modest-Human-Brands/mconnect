import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import type { Resource } from '~/server/types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw new HTTPError({
      statusCode: 400,
      statusMessage: 'Email ID parameter is required',
    })
  }

  try {
    const emailStorage = useStorage<Resource<'email'> & { htmlContent?: string }>('data:resource:email')
    const emailResources = (await emailStorage.getItems(await emailStorage.getKeys())).flatMap(({ value }) => value || [])

    const resource = emailResources.find((r) => r?.record?.id === id)

    if (!resource || !resource.record || !resource.record.properties) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Email with ID "${id}" not found`,
      })
    }

    const contactStorage = useStorage<Resource<'contact'>>('data:resource:contact')
    const contacts = (await contactStorage.getItems(await contactStorage.getKeys())).flatMap(({ value }) => value?.record || [])

    const userStorage = useStorage<Resource<'user'>>('data:resource:user')
    const users = (await userStorage.getItems(await userStorage.getKeys())).flatMap(({ value }) => value?.record || [])

    const record = resource.record
    const props = record.properties
    const subject = props.Title?.title?.[0]?.plain_text || '(No Subject)'
    const rawContent = props.Content?.rich_text?.[0]?.plain_text || ''
    const preview = rawContent.length > 100 ? `${rawContent.slice(0, 100)}...` : rawContent
    const dateString = props.Timestamp?.date?.start || record.created_time

    let senderName = 'Unknown Sender'
    let senderEmail = 'unknown@email.com'
    let avatarUrl = undefined
    let isVerified = false

    const contactId = props.Contact?.relation?.[0]?.id
    const userId = props.User?.relation?.[0]?.id

    if (props.Direction?.select?.name === 'Inbound' && contactId) {
      const contactRecord = contacts.find((c) => c.id === contactId)
      if (contactRecord) {
        senderName = contactRecord.properties.Name?.title?.[0]?.plain_text || contactRecord.properties.Name?.title?.[0]?.text?.content || 'Unknown Contact'
        senderEmail = contactRecord.properties.Email?.email || 'contact@example.com'
        avatarUrl = contactRecord.icon?.type === 'external' ? contactRecord.icon.external.url : contactRecord.icon?.type === 'file' ? contactRecord.icon.file?.url : undefined
      }
    } else if (userId) {
      const userRecord = users.find((u) => u.id === userId)
      if (userRecord) {
        senderName = userRecord.properties.Name?.title?.[0]?.plain_text || 'System User'
        senderEmail = userRecord.properties.Email?.email || 'system@modesthuman.com'
        avatarUrl = userRecord.icon?.type === 'external' ? userRecord.icon.external.url : userRecord.icon?.type === 'file' ? userRecord.icon.file?.url : undefined
        isVerified = true
      }
    }

    let contentHtml = sanitizeEmailHtml(resource.htmlContent || '')

    if (!contentHtml.trim()) {
      contentHtml = `<div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="font-size: 20px; margin-bottom: 16px; color: #000;">${subject}</h2>
          <p style="color: #4B5563; line-height: 1.6; white-space: pre-wrap;">${rawContent}</p>
        </div>`
    }

    return {
      id: record.id,
      senderName,
      senderEmail,
      avatarUrl,
      isVerified,
      subject,
      preview,
      date: new Date(dateString).toISOString(),
      contentHtml,
    }
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error(`API interaction/email/${id} GET error:`, error)
    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to fetch email details',
    })
  }
})
