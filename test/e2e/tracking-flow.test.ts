import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { H3Event } from 'h3'

import Component from '~/templates/text/email/ContentReleaseV1/component.vue'
import clickHandler from '~/server/api/track/click.get'
import openHandler from '~/server/api/track/open.get'
import trapHandler from '~/server/api/track/trap.get'

const mocks = vi.hoisted(() => ({
  templateConfig: null as any,
}))

vi.mock('~/server/utils/template-registry-email', () => ({
  default: (config: any) => {
    mocks.templateConfig = config
    return config
  },
}))

import '~/templates/text/email/ContentReleaseV1'

function createH3Event(urlStr: string, userAgent = 'Mozilla/5.0'): { event: H3Event; resHeaders: Headers } {
  const url = new URL(urlStr)
  const reqHeaders = new Headers({ 'user-agent': userAgent })
  const resHeaders = new Headers()
  const query = Object.fromEntries(url.searchParams.entries())

  const event = {
    req: {
      url: urlStr,
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
        url: `${url.pathname}${url.search}`,
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
    path: `${url.pathname}${url.search}`,
    context: { query },
  } as unknown as H3Event

  return { event, resHeaders }
}

describe('E2E Tracking & Template Pipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders HTML containing the tracking pixel, click URL, and honeypot link', async () => {
    const rawData = {
      recipient: { name: 'Dev Tester', email: 'dev@modesthumanbrands.com' },
      content: {
        title: 'Release Notes 1.0',
        imageUrl: 'https://cdn.example.com/banner.png',
        linkUrl: 'https://modesthumanbrands.com/blog/release-1',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsubscribe',
      tracking: {
        campaignId: 'camp-v1',
        recipientId: 'rec-dev-42',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // Verify click URL exists on CTA button / feature image
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('c=camp-v1')
    expect(html).toContain('r=rec-dev-42')

    // Verify tracking pixel exists
    expect(html).toContain('http://localhost:3000/api/track/open?c=camp-v1&r=rec-dev-42')

    // Verify invisible honeypot trap link exists
    expect(html).toContain('http://localhost:3000/api/track/trap?r=rec-dev-42')
  })

  it('simulates a human lifecycle: opens pixel, clicks CTA, and redirects to destination with UTM intact', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const rawData = {
      recipient: { name: 'Human User', email: 'human@example.com' },
      content: {
        title: 'Fresh Update',
        imageUrl: 'https://cdn.example.com/art.jpg',
        linkUrl: 'https://modesthumanbrands.com/products/tracker',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsubscribe',
      tracking: {
        campaignId: 'camp-human-flow',
        recipientId: 'rec-human-101',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)

    // 1. Human Opens Email -> hits pixel
    const { event: openEvt, resHeaders: openHeaders } = createH3Event(props.trackingPixelUrl, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')
    const pixelResponse = await openHandler(openEvt)

    expect(openHeaders.get('content-type')).toBe('image/gif')
    expect(Buffer.isBuffer(pixelResponse)).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[REAL OPEN] Recipient rec-human-101 opened on desktop'))

    // 2. Human Clicks Button -> follows click redirect
    const { event: clickEvt, resHeaders: clickHeaders } = createH3Event(props.ctaUrl, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')
    const clickResponse = (await clickHandler(clickEvt)) as any
    const redirectUrl = clickHeaders.get('location') || clickResponse?.headers?.get?.('location')

    expect(redirectUrl).toBe('https://modesthumanbrands.com/products/tracker?ref=mail-content&utm_source=mconnect&utm_medium=email')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[REAL CLICK] Recipient rec-human-101 clicked to https://modesthumanbrands.com/products/tracker'))
  })

  it('simulates security bot scanner: flags scanner on open and click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const rawData = {
      recipient: { name: 'Corporate Scan', email: 'scanner@enterprise.com' },
      content: {
        title: 'Internal Notice',
        imageUrl: 'https://cdn.example.com/img.jpg',
        linkUrl: 'https://modesthumanbrands.com/notice',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsub',
      tracking: {
        campaignId: 'camp-security-check',
        recipientId: 'rec-scan-500',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)

    // 1. Proofpoint scanner prefetches image pixel
    const { event: botOpenEvt } = createH3Event(props.trackingPixelUrl, 'Proofpoint-Email-Protection-Scanner/1.0')
    await openHandler(botOpenEvt)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[BOT FILTERED] Open by agent:proofpoint for Recipient rec-scan-500'))

    // 2. Proofpoint scans CTA link
    const { event: botClickEvt } = createH3Event(props.ctaUrl, 'Proofpoint-Email-Protection-Scanner/1.0')
    await clickHandler(botClickEvt)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[BOT FILTERED] Click scanner detected: agent:proofpoint'))
  })

  it('simulates web crawler falling into honeypot trap link', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const rawData = {
      recipient: { name: 'Bot Target', email: 'victim@enterprise.com' },
      content: {
        title: 'Trapped Mail',
        imageUrl: 'https://cdn.example.com/img.jpg',
        linkUrl: 'https://modesthumanbrands.com/notice',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsub',
      tracking: {
        campaignId: 'camp-trap',
        recipientId: 'rec-trapped-88',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)

    // Web crawler spiders all links in DOM, including invisible trap
    const { event: trapEvt } = createH3Event(props.honeypotUrl, 'AggressiveCrawlerBot/2.0')
    const trapResult = await trapHandler(trapEvt)

    expect(trapResult).toBe('OK')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[HONEYPOT TRIGGERED] Recipient rec-trapped-88's email is being actively scanned by a bot."))
  })
})
