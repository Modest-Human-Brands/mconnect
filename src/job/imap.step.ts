import { cron, type Handlers, type StepConfig } from 'motia'
import { loadConfig } from 'c12'
import { ImapFlow } from 'imapflow'
import { ofetch } from 'ofetch'
import { simpleParser } from 'mailparser'

const apiBaseUrl = import.meta.env.INTERNAL_API_URL

const { config: configFile } = await loadConfig({
  configFile: './config/messaging.config.yaml',
})

export const config = {
  name: 'PollImapInboxWorker',
  description: 'Polls the traditional mailbox every minute for unread interaction emails',
  flows: ['webhook-pipeline-flow'],
  triggers: [cron('*/30 * * * * * *')],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async () => {
  const emailConfig = configFile.emailConfig

  if (emailConfig?.provider?.active !== 'smtp') {
    return { status: 200, body: { message: 'Worker skipped: Active provider is not SMTP.' } }
  }

  const imapSettings = emailConfig.settings?.imap

  const client = new ImapFlow({
    host: imapSettings.host,
    port: imapSettings.port,
    secure: imapSettings.secure,
    auth: {
      user: imapSettings.auth?.user,
      pass: imapSettings.auth?.pass,
    },
    logger: false,
  })

  await client.connect()
  const lock = await client.getMailboxLock('INBOX')

  try {
    for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true })) {
      const fromEnvelope = msg.envelope.from[0]
      const fromAddress = fromEnvelope.address
      const toAddress = msg.envelope.to[0]?.address || imapSettings.auth?.user

      try {
        const parsedEmail = await simpleParser(msg.source.toString('utf8'))

        await ofetch(`${apiBaseUrl}/api/connect/text/email/receive`, {
          method: 'POST',
          body: {
            from: fromAddress || parsedEmail.from.text,
            to: toAddress || parsedEmail.to.text,
            subject: msg.envelope.subject || parsedEmail.subject,
            text: parsedEmail.text,
            html: parsedEmail.html,
          },
        })

        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'])
        console.log(`✅ Successfully processed email UID: ${msg.uid}`)
      } catch (webhookError) {
        console.error(`❌ Failed to ingest email UID ${msg.uid}:`, webhookError.message)
      }
    }
  } finally {
    lock.release()
    await client.logout()
  }

  return {
    status: 200,
    body: { message: 'IMAP mailbox polling cycle complete.' },
  }
}
