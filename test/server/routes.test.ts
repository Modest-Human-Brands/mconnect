import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'
import clickHandler from '~/server/api/track/click.get'
import openHandler from '~/server/api/track/open.get'
import trapHandler from '~/server/api/track/trap.get'

function createRouteEvent(query: Record<string, string>, userAgent = 'Mozilla/5.0') {
  const queryString = new URLSearchParams(query).toString()
  const path = queryString ? `/?${queryString}` : '/'

  const reqHeaders = new Headers()
  reqHeaders.set('user-agent', userAgent)

  const resHeaders = new Headers()

  const event = {
    req: {
      url: `http://localhost${path}`,
      method: 'GET',
      headers: reqHeaders,
    },
    res: {
      status: 200,
      statusText: 'OK',
      headers: resHeaders,
    },
    node: {
      req: {
        url: path,
        method: 'GET',
        headers: Object.fromEntries(reqHeaders.entries()),
        socket: { remoteAddress: '8.8.8.8' },
      },
      res: {
        statusCode: 200,
        setHeader: (name: string, value: string) => resHeaders.set(name, value),
        getHeader: (name: string) => resHeaders.get(name),
        end: () => {},
      },
    },
    path,
    context: {
      query,
    },
  } as unknown as H3Event

  return { event, resHeaders }
}

describe('Tracking Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('click.get: redirects human click to target URL and logs real click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const target = 'https://example.com/blog/article'
    const { event } = createRouteEvent({
      url: encodeURIComponent(target),
      c: 'camp-123',
      r: 'rec-456',
    })

    await clickHandler(event)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[REAL CLICK] Recipient rec-456 clicked to https://example.com/blog/article'))
  })

  it('click.get: falls back gracefully when target url is missing', async () => {
    const { event, resHeaders } = createRouteEvent({})
    const res = (await clickHandler(event)) as any
    const location = resHeaders.get('location') || res?.headers?.get?.('location') || res?.headers?.location

    expect(location).toBe('https://modesthumanbrands.com')
  })

  it('click.get: detects and logs scanner bot clicks', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { event } = createRouteEvent(
      {
        url: encodeURIComponent('https://example.com'),
        c: 'camp-123',
        r: 'rec-456',
      },
      'GoogleImageProxy'
    )

    await clickHandler(event)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[BOT FILTERED] Click scanner detected: agent:googleimageproxy'))
  })

  it('open.get: returns transparent 1x1 GIF with no-cache headers', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { event, resHeaders } = createRouteEvent({ c: 'camp-123', r: 'rec-456' })

    const result = await openHandler(event)

    expect(resHeaders.get('content-type')).toBe('image/gif')
    expect(resHeaders.get('cache-control')).toContain('no-store')
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[REAL OPEN] Recipient rec-456 opened on desktop'))
  })

  it('trap.get: logs honeypot trigger for recipient', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { event } = createRouteEvent({ r: 'rec-456' })

    const res = await trapHandler(event)

    expect(res).toBe('OK')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[HONEYPOT TRIGGERED] Recipient rec-456's email is being actively scanned by a bot."))
  })
})
