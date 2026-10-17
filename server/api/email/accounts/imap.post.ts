import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'

import { saveEmailAccount, toPublicAccount } from '#server/utils/email-accounts.ts'
import { verifyImapCredentials } from '#server/utils/email-connection.ts'
import resolveOrgSlug from '#server/utils/resolve-org-slug.ts'

const port = z.coerce.number().int().min(1).max(65_535)

const bodySchema = z.object({
  fromName: z.string().trim().min(1),
  fromEmail: z.email(),
  imapHost: z.string().trim().min(1),
  imapPort: port,
  smtpHost: z.string().trim().min(1),
  smtpPort: port,
  user: z.string().trim().min(1),
  pass: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const orgSlug = await resolveOrgSlug(event)
  const body = await readValidatedBody(event, bodySchema)

  const imap = { host: body.imapHost, port: body.imapPort, user: body.user, pass: body.pass }
  const smtp = { host: body.smtpHost, port: body.smtpPort, user: body.user, pass: body.pass }

  try {
    await verifyImapCredentials(imap, smtp)
  } catch (error: any) {
    // The UI shows statusMessage as-is.
    throw new HTTPError({ statusCode: 400, statusMessage: error.message, message: error.message })
  }

  const account = await saveEmailAccount(orgSlug, {
    provider: 'imap',
    address: body.fromEmail,
    fromName: body.fromName,
    imap,
    smtp,
    status: 'connected',
  })

  return toPublicAccount(account)
})
