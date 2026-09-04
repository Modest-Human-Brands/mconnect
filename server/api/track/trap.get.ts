import type { TelemetryRecord } from '#server/types/telemetry.ts'
import { defineEventHandler, getQuery } from 'h3'
import { useStorage } from 'nitro/storage'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const emailId = query.e as string

  if (emailId) {
    console.log(`[HONEYPOT TRIGGERED] Email ${emailId} is being actively scanned by a bot.`)

    const telemetryStorage = useStorage<TelemetryRecord>('data:telemetry')
    const trapEventId = `${emailId}:trap:${Date.now()}`

    await telemetryStorage.setItem(trapEventId, {
      id: trapEventId,
      type: 'trap',
      emailId,
      isBot: 'honeypot',
      timestamp: new Date(),
      isValid: false,
    })

    // Retroactively invalidate all recent records for this email
    const emailKeys = await telemetryStorage.getKeys(emailId)
    for (const key of emailKeys) {
      if (key === trapEventId) continue
      const record = await telemetryStorage.getItem(key)
      if (record && record.isValid) {
        record.isValid = false
        record.invalidatedReason = 'honeypot_trap'
        await telemetryStorage.setItem(key, record)
      }
    }
  }

  return 'OK'
})
