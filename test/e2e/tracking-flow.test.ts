import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { H3Event } from 'h3'
import { createStorage } from 'unstorage'

import Component from '~/templates/text/email/ContentReleaseV1/component.vue'
import clickHandler from '~/server/api/track/click.get'
import openHandler from '~/server/api/track/open.get'
import trapHandler from '~/server/api/track/trap.get'

const testStorage = createStorage()
// @ts-ignore
globalThis.useStorage = () => testStorage

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
      emailSubject: 'Release Notes 1.0',
      content: {
        badge: 'Product Update',
        title: 'Release Notes 1.0',
        meta: 'Engineering · 2 min read',
        imageUrl: 'https://cdn.example.com/banner.png',
        excerpt: 'Check out all the new features, performance updates, and bug fixes.',
        ctaLabel: 'Read Release Notes',
        linkUrl: 'https://modesthumanbrands.com/blog/release-1',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsubscribe',
      tracking: {
        emailId: 'email-dev-42',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // Verify click URL exists on CTA button / feature image
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-dev-42')

    // Verify editorial content renders
    expect(html).toContain('Product Update')
    expect(html).toContain('Release Notes 1.0')
    expect(html).toContain('Read Release Notes')

    // Verify tracking pixel exists
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-dev-42')

    // Verify invisible honeypot trap link exists
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-dev-42')
  })

  it('simulates a human lifecycle: opens pixel, clicks CTA, and redirects to destination with UTM intact', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const rawData = {
      recipient: { name: 'Human User', email: 'human@example.com' },
      emailSubject: 'Fresh Update',
      content: {
        badge: 'New Release',
        title: 'Fresh Update',
        meta: '3 min read',
        imageUrl: 'https://cdn.example.com/art.jpg',
        excerpt: 'Take an inside look at our latest workflow tool release.',
        ctaLabel: 'Read More',
        linkUrl: 'https://modesthumanbrands.com/products/tracker',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsubscribe',
      tracking: {
        emailId: 'email-human-101',
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
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[REAL OPEN] Email email-human-101 opened on desktop'))

    // 2. Human Clicks Button -> follows click redirect
    const { event: clickEvt, resHeaders: clickHeaders } = createH3Event(props.ctaUrl, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')
    const clickResponse = (await clickHandler(clickEvt)) as any
    const redirectUrl = clickHeaders.get('location') || clickResponse?.headers?.get?.('location')

    expect(redirectUrl).toBe('https://modesthumanbrands.com/products/tracker?ref=mail-content&utm_source=mconnect&utm_medium=email')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[REAL CLICK] Email email-human-101 clicked to https://modesthumanbrands.com/products/tracker'))
  })

  it('simulates security bot scanner: flags scanner on open and click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const rawData = {
      recipient: { name: 'Corporate Scan', email: 'scanner@enterprise.com' },
      emailSubject: 'Internal Notice',
      content: {
        badge: 'Security Notice',
        title: 'Internal Notice',
        meta: 'Compliance Dept',
        imageUrl: 'https://cdn.example.com/img.jpg',
        excerpt: 'Routine security protocol check.',
        ctaLabel: 'View Notice',
        linkUrl: 'https://modesthumanbrands.com/notice',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsub',
      tracking: {
        emailId: 'email-scan-500',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)

    // 1. Proofpoint scanner prefetches image pixel
    const { event: botOpenEvt } = createH3Event(props.trackingPixelUrl, 'Proofpoint-Email-Protection-Scanner/1.0')
    await openHandler(botOpenEvt)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[BOT FILTERED] Open by agent:proofpoint for Email email-scan-500'))

    // 2. Proofpoint scans CTA link
    const { event: botClickEvt } = createH3Event(props.ctaUrl, 'Proofpoint-Email-Protection-Scanner/1.0')
    await clickHandler(botClickEvt)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[BOT FILTERED] Click scanner detected: agent:proofpoint'))
  })

  it('simulates web crawler falling into honeypot trap link', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const rawData = {
      recipient: { name: 'Bot Target', email: 'victim@enterprise.com' },
      emailSubject: 'Trapped Mail',
      content: {
        badge: 'Alert',
        title: 'Trapped Mail',
        meta: 'Test Case',
        imageUrl: 'https://cdn.example.com/img.jpg',
        excerpt: 'Automated crawler honeypot detection.',
        ctaLabel: 'Learn More',
        linkUrl: 'https://modesthumanbrands.com/notice',
      },
      unsubscribeUrl: 'https://modesthumanbrands.com/unsub',
      tracking: {
        emailId: 'email-trapped-88',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)

    // Web crawler spiders all links in DOM, including invisible trap
    const { event: trapEvt } = createH3Event(props.honeypotUrl, 'AggressiveCrawlerBot/2.0')
    const trapResult = await trapHandler(trapEvt)

    expect(trapResult).toBe('OK')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[HONEYPOT TRIGGERED] Email email-trapped-88 is being actively scanned by a bot.'))
  })
})
