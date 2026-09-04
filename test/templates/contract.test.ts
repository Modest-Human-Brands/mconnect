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

import Component from '~/templates/text/email/ContractV1/component.vue'
import '~/templates/text/email/ContractV1/index'

describe('Contract Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('contract')
  })

  it('generates tracked CTA, dynamic pixel, and honeypot with explicit tracking parameters', () => {
    const rawData = {
      contact: {
        name: 'Jane Doe',
        role: 'Director of Photography',
      },
      project: {
        title: 'Commercial Film Shoot',
        quoteNumber: 'QT-2026-999',
        quoteDate: new Date('2026-09-10'),
        shootDate: new Date('2026-09-15'),
        shootLocation: 'Kolkata Studio 1',
        callTime: '07:30 AM',
      },
      totalAmount: 250_000,
      link: 'https://modesthumanbrands.com/contracts/sign/123',
      tracking: {
        emailId: 'email-contract-test-99',
        baseUrl: 'https://connect.modesthumanbrands.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // 1. Canonical Fields
    expect(payload.recipientName).toBe('Jane Doe')
    expect(payload.recipientRole).toBe('Director of Photography')
    expect(payload.projectName).toBe('Commercial Film Shoot')
    expect(payload.totalAmount).toBe(250_000)

    // 2. Click-Wrapped CTA URL
    expect(payload.ctaUrl).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaUrl).toContain('e=email-contract-test-99')

    const urlParam = new URL(payload.ctaUrl).searchParams.get('url')
    expect(urlParam).toBe('https://modesthumanbrands.com/contracts/sign/123?ref=mail-contract&utm_source=mconnect&utm_medium=email')

    // 3. Telemetry Open Pixel & Honeypot Link
    expect(payload.trackingPixelUrl).toBe('https://connect.modesthumanbrands.com/api/track/open?e=email-contract-test-99')
    expect(payload.honeypotUrl).toBe('https://connect.modesthumanbrands.com/api/track/trap?e=email-contract-test-99')

    // 4. Organization Branding Keys
    expect(payload.organizationName).toBe('Modest Human Brands')
    expect(payload.organizationWebsite).toBe('https://modesthumanbrands.com')
    expect(payload.organizationLogo).toBe('https://modesthumanbrands.com/logo.svg')
    expect(payload.organizationColorPrimary).toBe('#2B2B2B')
    expect(payload.organizationColorAccent).toBe('#4A85FF')
    expect(payload.organizationFont).toBe('Exo2')
  })

  it('falls back to default placeholder tracking when tracking is omitted', () => {
    const rawData = {
      contact: {
        name: 'Sam Smith',
        role: 'Gaffer',
      },
      project: {
        title: 'Indie Feature',
        quoteNumber: 'QT-2026-101',
        quoteDate: new Date(),
        shootDate: new Date(),
        shootLocation: 'On Location',
        callTime: '06:00 AM',
      },
      totalAmount: 50_000,
      link: 'https://modesthumanbrands.com/contracts/sign/fallback',
      organization: mocks.templateConfig.placeholders.organization,
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

  it('renders compiled HTML containing the tracked CTA button, honeypot trap, and telemetry pixel', async () => {
    const rawData = {
      contact: {
        name: 'Mark Taylor',
        role: 'Sound Engineer',
      },
      project: {
        title: 'Studio Session A',
        quoteNumber: 'QT-2026-777',
        quoteDate: new Date('2026-09-01'),
        shootDate: new Date('2026-09-05'),
        shootLocation: 'Main Floor',
        callTime: '09:00 AM',
      },
      totalAmount: 75_000,
      link: 'https://modesthumanbrands.com/contracts/sign/777',
      tracking: {
        emailId: 'email-ssr-contract-777',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // Button and action link
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-ssr-contract-777')
    expect(html).toContain('Review and Sign')

    // Honeypot trap link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-contract-777')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-contract-777')
  })
})
