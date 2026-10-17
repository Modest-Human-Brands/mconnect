import { HTTPError, type H3Event } from 'nitro/h3'

import notion from '#server/utils/notion.ts'
import notionTextStringify from '#server/utils/notion-text-stringify.ts'
import { assertOrgSlug } from '#server/utils/email-accounts.ts'
import type { NotionOrganization } from '~/server/types'

function isUuid(text: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)
}

/** Maps the `x-org-id` header (organization slug or Notion page id) to the slug used for the config YAML files. */
export default async function (event: H3Event) {
  const orgId = event.req.headers.get('x-org-id')
  if (!orgId) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'x-org-id header is required' })
  }
  return resolveOrgSlug(orgId)
}

export async function resolveOrgSlug(orgId: string) {
  let orgSlug = orgId
  if (isUuid(orgId)) {
    const orgPage = (await notion.pages.retrieve({ page_id: orgId })) as unknown as NotionOrganization
    orgSlug = notionTextStringify(orgPage.properties.Id.rich_text) || orgId
  }
  return assertOrgSlug(orgSlug)
}
