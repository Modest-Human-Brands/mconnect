import { HTTPError } from 'nitro/h3'
import { randomUUID } from 'node:crypto'
import MailComposer from 'nodemailer/lib/mail-composer'

import { markRecorded } from '#server/utils/email-ledger.ts'
import { resolveEmailAccount, type EmailAccount } from '#server/utils/email-accounts.ts'
import { findSentMailbox, openImapClient, openSmtpTransport } from '#server/utils/email-connection.ts'

interface DispatchEmailPayload {
  to: string
  subject: string
  text: string
  html: string
  displayName?: string
  attachments?: { filename: string; content: Buffer<ArrayBuffer>; contentType: string }[]
}

/** Gmail and Outlook file SMTP-sent mail under Sent themselves; plain IMAP servers do not. */
async function appendToSentFolder(orgSlug: string, account: EmailAccount, mailOptions: any) {
  try {
    const messageBuffer = await new MailComposer(mailOptions).compile().build()
    const client = await openImapClient(orgSlug, account)
    try {
      const sentMailbox = await findSentMailbox(client)
      await client.append(sentMailbox ? sentMailbox.path : 'Sent', messageBuffer, ['\\Seen'])
    } finally {
      await client.logout()
    }
  } catch (error) {
    console.error('[IMAP SYNC ERROR] Failed to save copy to Sent folder:', error)
  }
}

export default async function (payload: DispatchEmailPayload, orgSlug: string, accountId?: string) {
  const account = await resolveEmailAccount(orgSlug, accountId)
  const fromName = payload.displayName || account.fromName

  // One explicit Message-ID shared by the SMTP delivery and the copy appended to Sent, so sync can recognise it.
  const messageId = `<${randomUUID()}@${account.address.split('@')[1]}>`
  const mailOptions = {
    messageId,
    from: fromName ? { name: fromName, address: account.address } : account.address,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments,
  }

  const transporter = await openSmtpTransport(orgSlug, account)
  try {
    await transporter.sendMail(mailOptions)
    await markRecorded(messageId)
    if (account.provider === 'imap') appendToSentFolder(orgSlug, account, mailOptions).catch(() => {})
    return { providerMessageId: messageId, accountId: account.id, provider: account.provider }
  } catch (error: any) {
    throw new HTTPError({ statusCode: 502, statusMessage: `Sending from ${account.address} failed: ${error?.response || error?.message || 'unknown error'}` })
  } finally {
    transporter.close()
  }
}
