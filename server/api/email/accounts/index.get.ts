import { defineEventHandler } from 'nitro/h3'

import { listEmailAccounts, toPublicAccount } from '#server/utils/email-accounts.ts'
import resolveOrgSlug from '#server/utils/resolve-org-slug.ts'

export default defineEventHandler(async (event) => {
  const orgSlug = await resolveOrgSlug(event)
  return (await listEmailAccounts(orgSlug)).map((account) => toPublicAccount(account))
})
