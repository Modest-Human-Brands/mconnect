import { HTTPError, type H3Event } from 'nitro/h3'

/** The acting user's id (their Notion user page id) the API-key middleware read from `x-user-id`. */
export default function (event: H3Event) {
  const userId = (event.context.userId as string | undefined) ?? event.req.headers.get('x-user-id')?.trim()
  if (!userId) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'x-user-id header is required' })
  }
  return userId
}
