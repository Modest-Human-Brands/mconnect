import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
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

    const contactPage = (await notion.pages.retrieve({ page_id: contactId })) as any
    const userPage = (await notion.pages.retrieve({ page_id: userId })) as any

    const destinationPhone = contactPage?.properties?.Phone?.phone_number || contactPage?.properties?.Phone?.phone
    const userPhone = userPage?.properties?.Phone?.phone_number || userPage?.properties?.Phone?.phone

    if (!destinationPhone) {
      event.res.status = 400
      return { error: `Contact page '${contactId}' does not contain a valid phone number property.` }
    }

    if (!webCall && !userPhone) {
      event.res.status = 400
      return { error: `User page '${userId}' does not contain a valid phone number property for SIP bridging.` }
    }

    const bridgeResult = await initializeLiveKitSipBridge({
      contactId,
      userId,
      destinationPhone,
      userPhone: webCall ? undefined : userPhone,
      webCall: !!webCall,
      recordCall,
    })

    event.res.status = 200
    return {
      status: 'bridging_initiated',
      provider: 'livekit-sip',
      callUuid: bridgeResult.callUuid,
    }
  } catch (error: any) {
    console.error('API connect/phone/call/send POST', error)

    if (error instanceof z.ZodError) {
      event.res.status = 400
      return { error: 'Invalid payload attributes supplied.', details: error.errors }
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
