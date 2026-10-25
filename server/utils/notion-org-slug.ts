import notion from '#server/utils/notion.ts'
import notionTextStringify from '#server/utils/notion-text-stringify.ts'
import type { NotionOrganization } from '~/server/types'

// Organization slugs never change once set, so a page-id -> slug cache is safe for the process lifetime.
const slugByPageId = new Map<string, Promise<string | undefined>>()

/** Resolves a Notion organization page id to its slug (the page's `Id` text property). */
export default function (pageId: string) {
  let slug = slugByPageId.get(pageId)
  if (!slug) {
    slug = notion.pages
      .retrieve({ page_id: pageId })
      .then((page) => notionTextStringify((page as unknown as NotionOrganization).properties.Id.rich_text) || undefined)
      .catch((error) => {
        slugByPageId.delete(pageId) // do not cache failures
        throw error
      })
    slugByPageId.set(pageId, slug)
  }
  return slug
}
