import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import { loadConfig } from 'c12'
import { ImapFlow } from 'imapflow'
import { $fetch } from 'ofetch'
import { simpleParser } from 'mailparser'

export default defineTask({
  meta: {
    name: 'PollImapInboxWorker',
    description: 'Polls the traditional mailbox every minute for unread interaction emails',
  },
  async run() {
    try {
      const { config: configFile } = await loadConfig({
        configFile: `../config/organizations/${orgSlug}.yaml`,
      })

      const emailConfig = configFile?.emailConfig

      if (emailConfig?.provider?.active !== 'smtp') {
        return { result: 'Worker skipped: Active provider is not SMTP.' }
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

            await $fetch('/api/interaction/email/receive', {
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
          } catch (webhookError: any) {
            console.error(`❌ Failed to ingest email UID ${msg.uid}:`, webhookError.message)
          }
        }
      } finally {
        lock.release()
        await client.logout()
      }

      return { result: 'IMAP mailbox polling cycle complete.' }
    } catch (error: any) {
      console.error('Task PollImapInboxWorker run', error)

      const { code: errorCode } = error as { code?: string }

      if (error instanceof Error && 'statusCode' in error) {
        throw error
      }

      throw new HTTPError({
        statusCode: 500,
        statusMessage: 'Some Unknown Error Found',
      })
    }
  },
})
