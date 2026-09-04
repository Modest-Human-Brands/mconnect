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
      category: 'food',
      ctaUrl: 'https://modesthumanbrands.com/book-call',
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
    expect(payload.categoryName).toBe('food')
    expect(payload.portfolioItems).toBeDefined()
    expect(payload.portfolioItems.length).toBeGreaterThan(0)

    // Click-wrapped CTA URL
    expect(payload.ctaUrl).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaUrl).toContain('e=email-outreach-test-1')

    const urlParam = new URL(payload.ctaUrl).searchParams.get('url')
    expect(urlParam).toBe('https://modesthumanbrands.com/book-call?ref=mail-outreach&utm_source=mconnect&utm_medium=email')

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
      category: 'ecommerce',
      ctaUrl: 'https://modesthumanbrands.com/call',
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.ctaUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('keeps hash CTA as # without wrapping when ctaUrl is #', () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      ctaUrl: '#',
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    expect(payload.ctaUrl).toBe('#')
  })

  it('renders compiled HTML containing CTA link, honeypot trap, and telemetry pixel', async () => {
    const rawData = {
      recipient: { name: 'SSR Prospect' },
      category: 'ecommerce',
      ctaUrl: 'https://modesthumanbrands.com/schedule',
      unsubscribeUrl: 'https://modesthumanbrands.com/unsub',
      tracking: {
        emailId: 'email-ssr-outreach-99',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // CTA button link with click tracking
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-ssr-outreach-99')
    expect(html).toContain('Book Strategy Call')

    // Invisible honeypot trap link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-outreach-99')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-outreach-99')
  })
})
