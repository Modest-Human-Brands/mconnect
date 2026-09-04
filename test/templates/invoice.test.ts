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

import Component from '~/templates/text/email/InvoiceV1/component.vue'
import '~/templates/text/email/InvoiceV1/index'

describe('Invoice Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('invoice')
  })

  it('generates tracked CTA, dynamic pixel, and honeypot with explicit tracking parameters', () => {
    const rawData = {
      recipient: {
        name: 'Acme Corp',
      },
      pricingModel: 'project',
      project: {
        title: 'Brand Redesign Project',
        invoiceNumber: 'INV-2026-001',
        quotationNumber: 'QT-2026-001',
      },
      deliverables: [
        { title: 'Brand Identity', rate: 10_000, quantity: 1, points: ['Logo', 'Palette'] },
        { title: 'Web App Design', rate: 20_000, quantity: 1, points: ['Figma System'] },
      ],
      financials: {
        discountLabel: 'Partner Discount',
        discountValue: 10,
        isDiscountPercentage: true,
        taxLabel: 'GST @ 18%',
        taxRate: 18,
        amountPaid: 5000,
      },
      dueDate: new Date('2026-09-30'),
      invoiceUrl: 'https://modesthumanbrands.com/invoices/INV-2026-001.pdf',
      tracking: {
        emailId: 'email-inv-test-101',
        baseUrl: 'https://connect.modesthumanbrands.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // Financial calculations
    // Subtotal: 30000, Discount (10%): 3000, Post-discount: 27000, Tax (18%): 4860, Grand Total: 31860, Due: 26860
    expect(payload.financialsSubtotal).toBe(30_000)
    expect(payload.financialsDiscountAmount).toBe(3000)
    expect(payload.financialsTaxAmount).toBe(4860)
    expect(payload.financialsGrandTotal).toBe(31_860)
    expect(payload.financialsAmountDue).toBe(26_860)
    expect(payload.paymentStatus).toBe('PARTIALLY PAID')

    // Click-wrapped URL
    expect(payload.ctaUrl).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaUrl).toContain('e=email-inv-test-101')

    const urlParam = new URL(payload.ctaUrl).searchParams.get('url')
    expect(urlParam).toBe('https://modesthumanbrands.com/invoices/INV-2026-001.pdf?ref=mail-invoice&utm_source=mconnect&utm_medium=email')

    // Dynamic pixel & honeypot URLs
    expect(payload.trackingPixelUrl).toBe('https://connect.modesthumanbrands.com/api/track/open?e=email-inv-test-101')
    expect(payload.honeypotUrl).toBe('https://connect.modesthumanbrands.com/api/track/trap?e=email-inv-test-101')

    // Organization branding
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
      invoiceUrl: 'https://modesthumanbrands.com/invoices/fallback.pdf',
      tracking: undefined,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.ctaUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('keeps hash CTA as # without wrapping when invoiceUrl is #', () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      invoiceUrl: '#',
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    expect(payload.ctaUrl).toBe('#')
  })

  it('getAttachments returns an empty array when invoiceUrl is #', async () => {
    const attachments = await mocks.templateConfig.getAttachments({
      ...mocks.templateConfig.placeholders,
      invoiceUrl: '#',
    })

    expect(attachments).toEqual([])
  })

  it('renders compiled HTML with CTA button, honeypot trap, and open telemetry pixel', async () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      invoiceUrl: 'https://modesthumanbrands.com/invoices/test-ssr.pdf',
      tracking: {
        emailId: 'email-ssr-inv-99',
        baseUrl: 'http://localhost:3000',
      },
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // CTA button with click tracking
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-ssr-inv-99')
    expect(html).toContain('View Invoice')

    // Invisible honeypot link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-inv-99')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-inv-99')
  })
})
