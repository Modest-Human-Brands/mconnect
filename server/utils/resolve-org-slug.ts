import { HTTPError, type H3Event } from 'nitro/h3'

import { assertOrgSlug } from '#server/utils/email-accounts.ts'

/** The organization slug (e.g. `modest-human-brands`) the API-key middleware validated from `x-org-id`. */
export default function (event: H3Event) {
  const orgSlug = (event.context.orgSlug as string | undefined) ?? event.req.headers.get('x-org-id')
  if (!orgSlug) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'x-org-id header is required' })
  }
  return assertOrgSlug(orgSlug)
}
