import { useStorage } from 'nitro/storage'

// Remembers Message-IDs we already recorded, so mail we sent through the API is not re-imported from
// the Sent folder and mail seen in several folders is only recorded once.
const ledger = () => useStorage<number>('data:email-ledger')

const keyOf = (messageId: string) => Buffer.from(messageId.trim().toLowerCase()).toString('base64url')

export const isRecorded = (messageId: string) => ledger().hasItem(keyOf(messageId))

export const markRecorded = (messageId: string) => ledger().setItem(keyOf(messageId), Date.now())
