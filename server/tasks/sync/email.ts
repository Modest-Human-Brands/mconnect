import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import { simpleParser } from 'mailparser'
import { $fetch } from 'ofetch'
import type { ImapFlow } from 'imapflow'

import { listEmailAccounts, listOrgSlugs, type EmailAccount } from '#server/utils/email-accounts.ts'
import { findSentMailbox, openImapClient } from '#server/utils/email-connection.ts'
import { isRecorded, markRecorded } from '#server/utils/email-ledger.ts'

type Direction = 'inbound' | 'outbound'

interface Watermark {
  uidValidity: string
  lastUid: number
}

const FIRST_SYNC_DAYS = 7
let running = false

/**
 * Imports mail newer than the stored UID watermark. Nothing is flagged or moved on the server, so the
 * mailbox looks the same to the people using it; the watermark (not \Seen) tracks progress.
 */
async function syncFolder(client: ImapFlow, folder: string, direction: Direction, account: EmailAccount, orgSlug: string, baseURL: string, sinceDays: number) {
  const lock = await client.getMailboxLock(folder)
  const watermarks = useStorage<Watermark>('data:email-sync')
  const watermarkKey = `${orgSlug}:${account.id}:${direction}`
  let imported = 0

  try {
    const mailbox = client.mailbox as { uidValidity: bigint; exists: number }
    const uidValidity = String(mailbox.uidValidity)
    let saved = await watermarks.getItem(watermarkKey)
    // A changed UIDVALIDITY means the server renumbered the folder, so the old watermark is meaningless.
    if (saved && saved.uidValidity !== uidValidity) saved = null
    if (!mailbox.exists) {
      await watermarks.setItem(watermarkKey, { uidValidity, lastUid: saved?.lastUid ?? 0 })
      return 0
    }

    const range = saved ? { uid: `${saved.lastUid + 1}:*` } : { since: new Date(Date.now() - sinceDays * 86_400_000) }
    // Collect first: running other IMAP commands while a fetch is streaming can deadlock the connection.
    const messages: { uid: number; source: Buffer }[] = []
    for await (const msg of client.fetch(range, { uid: true, source: true }, { uid: true })) {
      // `N:*` always includes the newest message even when its UID is below N
      if (msg.source && (!saved || msg.uid > saved.lastUid)) messages.push({ uid: msg.uid, source: msg.source })
    }

    let lastUid = saved?.lastUid ?? 0
    for (const { uid, source } of messages.toSorted((a, b) => a.uid - b.uid)) {
      try {
        const parsed = await simpleParser(source)
        const messageId = parsed.messageId

        if (!messageId || !(await isRecorded(messageId))) {
          await $fetch('/api/interaction/email/receive', {
            baseURL,
            method: 'POST',
            body: {
              from: parsed.from?.text ?? '',
              to: parsed.to
                ? [parsed.to]
                    .flat()
                    .map((t) => t.text)
                    .join(', ')
                : account.address,
              subject: parsed.subject || 'No Subject',
              text: parsed.text,
              html: parsed.html || undefined,
              direction,
              date: parsed.date?.toISOString(),
            },
          })
          if (messageId) await markRecorded(messageId)
          imported++
        }
        lastUid = uid
      } catch (error: any) {
        // Stop at the first failure so the watermark never skips a message that still has to be retried.
        console.error(`[sync:email] ${account.address} ${folder} UID ${uid} failed:`, error?.message || error)
        break
      }
    }

    await watermarks.setItem(watermarkKey, { uidValidity, lastUid })
  } finally {
    lock.release()
  }

  return imported
}

async function syncAccount(orgSlug: string, account: EmailAccount, baseURL: string, sinceDays: number) {
  const client = await openImapClient(orgSlug, account)
  const counts = { inbound: 0, outbound: 0 }

  try {
    counts.inbound = await syncFolder(client, 'INBOX', 'inbound', account, orgSlug, baseURL, sinceDays)

    const sent = await findSentMailbox(client)
    if (sent) counts.outbound = await syncFolder(client, sent.path, 'outbound', account, orgSlug, baseURL, sinceDays)
  } finally {
    await client.logout().catch(() => client.close())
  }

  return counts
}

export default defineTask({
  meta: {
    name: 'sync:email',
    description: "Two-way sync with each organization's mail servers: imports new INBOX mail and mail sent from outside the API (Sent folder) into Notion",
  },
  async run({ payload }) {
    if (running) return { result: 'skipped: previous run still in progress' }
    running = true

    try {
      const baseURL = useRuntimeConfig().public.connectUrl
      const sinceDays = typeof payload?.sinceDays === 'number' ? payload.sinceDays : FIRST_SYNC_DAYS
      const orgSlugs = typeof payload?.orgSlug === 'string' ? [payload.orgSlug] : await listOrgSlugs()
      const results: Record<string, unknown> = {}

      for (const orgSlug of orgSlugs) {
        for (const account of await listEmailAccounts(orgSlug)) {
          if (account.status !== 'connected') continue
          const key = `${orgSlug}:${account.address}`
          try {
            results[key] = await syncAccount(orgSlug, account, baseURL, sinceDays)
          } catch (error: any) {
            console.error(`[sync:email] ${key} failed:`, error?.message || error)
            results[key] = `error: ${error?.message || 'unknown'}`
          }
        }
      }

      return { result: JSON.stringify(results) }
    } finally {
      running = false
    }
  },
})
