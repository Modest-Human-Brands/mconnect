import { defineEventHandler, getRouterParam, HTTPError, setResponseStatus } from 'nitro/h3'

import { deleteEmailAccount } from '#server/utils/email-accounts.ts'
import resolveOrgSlug from '#server/utils/resolve-org-slug.ts'

export default defineEventHandler(async (event) => {
  const orgSlug = await resolveOrgSlug(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Account ID parameter is required' })
  }

  await deleteEmailAccount(orgSlug, id)
  setResponseStatus(event, 204)
  return null
})
