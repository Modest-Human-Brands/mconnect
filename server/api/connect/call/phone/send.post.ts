import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import type { NotionContact, NotionUser } from '~/server/types'
import notion from '~/server/utils/notion'
import { initializeLiveKitSipBridge } from '~/server/utils/providers-phone'

const bodySchema = z.object({
  contactId: z.string().min(1),
  userId: z.string().min(1),
  orgId: z.string(),
  recordCall: z.boolean(),
  webCall: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const { contactId, userId, recordCall, orgId, webCall } = await readValidatedBody(event, bodySchema)

    console.log(`[Voice Engine]: Initializing LiveKit room bridge sequence for Contact: ${contactId} by User: ${userId}`)

    const contactPage = (await notion.pages.retrieve({ page_id: contactId })) as unknown as NotionContact
    const userPage = (await notion.pages.retrieve({ page_id: userId })) as unknown as NotionUser

    const destinationPhone = contactPage.properties.Phone.phone_number
    const userPhone = userPage.properties.Phone.phone_number

    if (!destinationPhone) {
      throw new HTTPError({ statusCode: 400, statusMessage: `Contact page '${contactId}' does not contain a valid phone number property.` })
    }

    if (!webCall && !userPhone) {
      throw new HTTPError({ statusCode: 400, statusMessage: `User page '${userId}' does not contain a valid phone number property for SIP bridging.` })
    }

    const bridgeResult = await initializeLiveKitSipBridge({
      contactId,
      userId,
      destinationPhone,
      userPhone: webCall ? undefined : userPhone,
      webCall: !!webCall,
      recordCall,
    })

    return {
      status: 'bridging_initiated',
      provider: 'livekit-sip',
      callUuid: bridgeResult.callUuid,
    }
  } catch (error: any) {
    console.error('API connect/phone/call/send POST', error)

    if (error instanceof z.ZodError) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid payload attributes supplied.' })
    }

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to programmatically establish high-performance call room parameters.',
    })
  }
})
