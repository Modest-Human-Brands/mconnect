import { describe, it, expect, vi, beforeAll } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const mocks = vi.hoisted(() => ({
  templateConfig: null as any,
}))

vi.mock('#server/utils/template-registry-email.ts', () => ({
  default: (config: any) => {
    mocks.templateConfig = config
    return config
  },
}))

vi.mock('~/server/utils/template-registry-email', () => ({
  default: (config: any) => {
    mocks.templateConfig = config
    return config
  },
}))

import Component from '~/templates/text/email/OutreachV1/component.vue'
import '~/templates/text/email/OutreachV1/index'

describe('Outreach Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('outreach')
  })

  it('generates tracked CTA, dynamic pixel, and honeypot with explicit tracking parameters', () => {
    const rawData = {
      recipient: { name: 'Acme Studio' },
      category: 'creative-studios',
      heroHeadline: 'Scale Your Studio Pipeline',
      ctaButtons: [
        { label: 'Explore Platform →', url: 'https://modesthumanbrands.com/' },
        { label: 'Book Demo', url: 'https://modesthumanbrands.com/demo' },
      ],
      ctaUrl: 'https://modesthumanbrands.com/get-started',
      unsubscribeUrl: 'https://modesthumanbrands.com/unsubscribe',
      tracking: {
        emailId: 'email-outreach-test-1',
        baseUrl: 'https://connect.modesthumanbrands.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // Template specific fields
    expect(payload.recipientName).toBe('Acme Studio')
    expect(payload.categoryName).toBe('creative-studios')
    expect(payload.heroHeadline).toBe('Scale Your Studio Pipeline')
    expect(payload.featuredItems).toBeDefined()
    expect(payload.featuredItems.length).toBe(4)
    expect(payload.featuredItems[0].title).toBe('Unified creative project pipeline')

    // Click-wrapped primary CTA URL
    expect(payload.ctaUrl).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaUrl).toContain('e=email-outreach-test-1')

    // Click-wrapped dual CTA buttons
    expect(payload.ctaButtons?.length).toBe(2)
    expect(payload.ctaButtons?.[0].url).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaButtons?.[0].url).toContain('e=email-outreach-test-1')
    const btn1Target = new URL(payload.ctaButtons![0].url).searchParams.get('url')
    expect(btn1Target).toBe('https://modesthumanbrands.com/?ref=mail-outreach&utm_source=mconnect&utm_medium=email')

    expect(payload.ctaButtons?.[1].url).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaButtons?.[1].url).toContain('e=email-outreach-test-1')
    const btn2Target = new URL(payload.ctaButtons![1].url).searchParams.get('url')
    expect(btn2Target).toBe('https://modesthumanbrands.com/demo?ref=mail-outreach&utm_source=mconnect&utm_medium=email')

    // Click-wrapped featured item cards
    expect(payload.featuredItems[0].linkUrl).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.featuredItems[0].linkUrl).toContain('e=email-outreach-test-1')
    const cardTarget = new URL(payload.featuredItems[0].linkUrl).searchParams.get('url')
    expect(cardTarget).toBe('https://modesthumanbrands.com/dashboard?ref=mail-outreach&utm_source=mconnect&utm_medium=email')

    // Dynamic telemetry pixel & honeypot URLs
    expect(payload.trackingPixelUrl).toBe('https://connect.modesthumanbrands.com/api/track/open?e=email-outreach-test-1')
    expect(payload.honeypotUrl).toBe('https://connect.modesthumanbrands.com/api/track/trap?e=email-outreach-test-1')

    // Organization branding keys
    expect(payload.organizationName).toBe('Modest Human Brands')
    expect(payload.organizationWebsite).toBe('https://modesthumanbrands.com')
    expect(payload.organizationLogo).toBe('https://modesthumanbrands.com/logo.svg')
    expect(payload.organizationColorPrimary).toBe('#2B2B2B')
    expect(payload.organizationColorAccent).toBe('#4A85FF')
    expect(payload.organizationFont).toBe('Exo2')
  })

  it('falls back to default placeholder tracking when tracking is omitted', () => {
    const rawData = {
      recipient: { name: 'Fallback Client' },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.ctaUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.ctaButtons?.[0].url).toContain(`e=${defaultEmailId}`)
    expect(payload.featuredItems[0].linkUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('keeps hash CTA as # without wrapping when ctaUrl is #', () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      ctaUrl: '#',
      ctaButtons: [{ label: 'Empty Link', url: '#' }],
      featuredItems: [{ title: 'Empty Card', imageUrl: 'https://example.com/img.png', linkUrl: '#' }],
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    expect(payload.ctaUrl).toBe('#')
    expect(payload.ctaButtons?.[0].url).toBe('#')
    expect(payload.featuredItems[0].linkUrl).toBe('#')
  })

  it('renders compiled HTML containing hero headline, dual CTA buttons, 2-column cards, and telemetry pixel', async () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      tracking: {
        emailId: 'email-ssr-outreach-99',
        baseUrl: 'http://localhost:3000',
      },
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // Greeting and copy
    expect(html).toContain('Hey Creative Director 👋')
    expect(html).toContain('Unified Studio Operations. Automate the Rest.')

    // Dual CTA buttons with click tracking
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-ssr-outreach-99')
    expect(html).toContain('Explore Platform →')
    expect(html).toContain('Book 15-Min Demo')

    // 2-Column Showcase Cards
    expect(html).toContain('// THE MHB SUITE')
    expect(html).toContain('Four Core Tools. One Connected Pipeline.')
    expect(html).toContain('Unified creative project pipeline')
    expect(html).toContain('Frictionless client agreements')
    expect(html).toContain('Live stream')
    expect(html).toContain('Unified media storage')

    // Invisible honeypot trap link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-outreach-99')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-outreach-99')
  })
})
