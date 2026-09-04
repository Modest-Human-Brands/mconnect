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

import Component from '~/templates/text/email/InternshipCompletionCertificateV1/component.vue'
import '~/templates/text/email/InternshipCompletionCertificateV1/index'

describe('Internship Completion Certificate Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('internship-completion-certificate')
  })

  it('generates tracked CTA, dynamic pixel, and honeypot with explicit tracking parameters', () => {
    const rawData = {
      recipient: { name: 'Dev Intern', role: 'Software Engineer Intern' },
      scopeOfWork: 'Backend API Development',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      dateOfIssue: new Date('2026-07-01'),
      signerName: 'Lead Engineer',
      signerTitle: 'VP of Engineering',
      certificateUrl: 'https://modesthumanbrands.com/certificates/dev-intern-101.pdf',
      tracking: {
        emailId: 'email-cert-101',
        baseUrl: 'https://connect.modesthumanbrands.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // Canonical Template Fields
    expect(payload.recipientName).toBe('Dev Intern')
    expect(payload.recipientRole).toBe('Software Engineer Intern')
    expect(payload.recipientScopeOfWork).toBe('Backend API Development')
    expect(payload.signerName).toBe('Lead Engineer')
    expect(payload.signerTitle).toBe('VP of Engineering')

    // Click-Wrapped Action URL
    expect(payload.ctaUrl).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(payload.ctaUrl).toContain('e=email-cert-101')

    const urlParam = new URL(payload.ctaUrl).searchParams.get('url')
    expect(urlParam).toBe('https://modesthumanbrands.com/certificates/dev-intern-101.pdf?ref=mail-certificate&utm_source=mconnect&utm_medium=email')

    // Dynamic Telemetry Pixel & Honeypot Trap Link
    expect(payload.trackingPixelUrl).toBe('https://connect.modesthumanbrands.com/api/track/open?e=email-cert-101')
    expect(payload.honeypotUrl).toBe('https://connect.modesthumanbrands.com/api/track/trap?e=email-cert-101')

    // Required Organization Branding Keys
    expect(payload.organizationName).toBe('Modest Human Brands')
    expect(payload.organizationWebsite).toBe('https://modesthumanbrands.com')
    expect(payload.organizationLogo).toBe('https://modesthumanbrands.com/logo.svg')
    expect(payload.organizationColorPrimary).toBe('#2B2B2B')
    expect(payload.organizationColorAccent).toBe('#4A85FF')
    expect(payload.organizationFont).toBe('Exo2')
  })

  it('falls back to default placeholder tracking when tracking is omitted', () => {
    const rawData = {
      recipient: { name: 'Fallback Intern', role: 'Design Intern' },
      scopeOfWork: 'Brand UI Assets',
      startDate: new Date(),
      endDate: new Date(),
      dateOfIssue: new Date(),
      signerName: 'Creative Director',
      signerTitle: 'Head of Design',
      certificateUrl: 'https://modesthumanbrands.com/certificates/fallback.pdf',
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.ctaUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('keeps hash CTA as # without wrapping when certificateUrl is #', () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      certificateUrl: '#',
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    expect(payload.ctaUrl).toBe('#')
  })

  it('getAttachments returns an empty array when certificateUrl is #', async () => {
    const attachments = await mocks.templateConfig.getAttachments({
      ...mocks.templateConfig.placeholders,
      certificateUrl: '#',
    })

    expect(attachments).toEqual([])
  })

  it('renders compiled HTML containing the certificate button, honeypot trap, and telemetry pixel', async () => {
    const rawData = {
      recipient: { name: 'Alice Walker', role: 'Product Intern' },
      scopeOfWork: 'Roadmap Analytics',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-08-01'),
      dateOfIssue: new Date('2026-08-05'),
      signerName: 'CPO',
      signerTitle: 'Chief Product Officer',
      certificateUrl: 'https://modesthumanbrands.com/certificates/alice.pdf',
      tracking: {
        emailId: 'email-ssr-cert-909',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // Button and action link
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-ssr-cert-909')
    expect(html).toContain('Download Certificate PDF')

    // Honeypot trap link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-cert-909')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-cert-909')
  })
})
