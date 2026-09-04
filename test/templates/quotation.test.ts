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

import Component from '~/templates/text/email/QuotationV1/component.vue'
import '~/templates/text/email/QuotationV1/index'

describe('Quotation Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('quotation')
  })

  it('generates tracked CTA, dynamic pixel, and honeypot with explicit tracking parameters', () => {
    const rawData = {
      recipient: {
        name: 'Stark Industries',
        isContact: true,
        isSigned: false,
      },
      pricingModel: 'project',
      project: {
        title: 'Arc Reactor Campaign',
        quotationNumber: 'QT-2026-789',
      },
      deliverables: [
        { title: 'Cinematography', rate: 12_000, quantity: 1, points: ['4K Video', 'Drone Footage'] },
        { title: 'Post Production', rate: 8000, quantity: 1, points: ['Color Grading'] },
      ],
      financials: {
        discountLabel: 'Special Discount',
        discountValue: 2000,
        isDiscountPercentage: false,
        taxLabel: 'GST @ 18%',
        taxRate: 18,
      },
      expiresIn: new Date('2026-09-30'),
      link: 'https://modesthumanbrands.com/proposals/QT-2026-789',
      tracking: {
        emailId: 'email-quote-test-101',
        baseUrl: 'https://connect.modesthumanbrands.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // Financial calculations
    // Subtotal: 20000, Discount: 2000, Post-discount: 18000, Tax (18%): 3240, Grand Total: 21240
    expect(payload.financialsSubtotal).toBe(20_000)
    expect(payload.financialsDiscountAmount).toBe(2000)
    expect(payload.financialsTaxAmount).toBe(3240)
    expect(payload.financialsGrandTotal).toBe(21_240)

    // Canonical fields
    expect(payload.recipientName).toBe('Stark Industries')
    expect(payload.quotationNumber).toBe('QT-2026-789')
    expect(payload.isRecipientContact).toBe(true)
    expect(payload.isSigned).toBe(false)

    // Click-wrapped CTA URL
    expect(payload.ctaUrl).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaUrl).toContain('e=email-quote-test-101')

    const urlParam = new URL(payload.ctaUrl).searchParams.get('url')
    expect(urlParam).toBe('https://modesthumanbrands.com/proposals/QT-2026-789?ref=mail-quotation&utm_source=mconnect&utm_medium=email')

    // Dynamic telemetry pixel & honeypot URLs
    expect(payload.trackingPixelUrl).toBe('https://connect.modesthumanbrands.com/api/track/open?e=email-quote-test-101')
    expect(payload.honeypotUrl).toBe('https://connect.modesthumanbrands.com/api/track/trap?e=email-quote-test-101')

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
      ...mocks.templateConfig.placeholders,
      link: 'https://modesthumanbrands.com/proposals/fallback',
      tracking: undefined,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.ctaUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('keeps hash CTA as # without wrapping when link is #', () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      link: '#',
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    expect(payload.ctaUrl).toBe('#')
  })

  it('renders compiled HTML with CTA button, honeypot trap, and open telemetry pixel', async () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      link: 'https://modesthumanbrands.com/proposals/ssr-test',
      tracking: {
        emailId: 'email-ssr-quote-55',
        baseUrl: 'http://localhost:3000',
      },
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // CTA button with click tracking
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-ssr-quote-55')
    expect(html).toContain('Review Full Proposal')

    // Invisible honeypot trap link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-quote-55')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-quote-55')
  })
})
