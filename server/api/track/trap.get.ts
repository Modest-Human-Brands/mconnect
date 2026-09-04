import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const recipientId = query.r as string

  if (recipientId) {
    console.log(`[HONEYPOT TRIGGERED] Recipient ${recipientId}'s email is being actively scanned by a bot.`)
  }

  return 'OK'
})
