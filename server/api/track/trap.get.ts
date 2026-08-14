import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const recipientId = query.r as string

  if (recipientId) {
    // 🚨 A human cannot see or click this link.
    // If triggered, flag this recipient's recent "opens" and "clicks" as invalid.

    // await db.emailEvents.update({ isValid: false }).where({ recipientId, timestamp: { $gte: Date.now() - 5000 } })
    console.log(`[HONEYPOT TRIGGERED] Recipient ${recipientId}'s email is being actively scanned by a bot.`)
  }

  // Return a generic success so the bot thinks it successfully mapped the link
  return 'OK'
})
