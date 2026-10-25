import { HTTPError, type H3Event } from 'nitro/h3'

import { assertOrgSlug } from '#server/utils/email-accounts.ts'

/** Reads the organization slug (e.g. `modest-human-brands`) from the required `x-org-id` header. */
export default function (event: H3Event) {
  const orgSlug = event.req.headers.get('x-org-id')
  if (!orgSlug) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'x-org-id header is required' })
  }
  return assertOrgSlug(orgSlug)
}
