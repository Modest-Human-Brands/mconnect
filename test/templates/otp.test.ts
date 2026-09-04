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

import Component from '~/templates/text/email/OtpV1/component.vue'
import '~/templates/text/email/OtpV1/index'

describe('OTP Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('otp')
  })

  it('generates dynamic telemetry pixel and honeypot with explicit tracking parameters', () => {
    const rawData = {
      recipientEmail: 'dev@modesthumanbrands.com',
      otpCode: '849201',
      expiresIn: '5 minutes',
      tracking: {
        emailId: 'email-otp-test-123',
        baseUrl: 'https://connect.modesthumanbrands.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // Template specific fields
    expect(payload.recipientEmail).toBe('dev@modesthumanbrands.com')
    expect(payload.otpCode).toBe('849201')
    expect(payload.expiresIn).toBe('5 minutes')

    // Telemetry URLs
    expect(payload.trackingPixelUrl).toBe('https://connect.modesthumanbrands.com/api/track/open?e=email-otp-test-123')
    expect(payload.honeypotUrl).toBe('https://connect.modesthumanbrands.com/api/track/trap?e=email-otp-test-123')

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
      recipientEmail: 'user@example.com',
      otpCode: '112233',
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('renders compiled HTML containing OTP code, honeypot link, and telemetry pixel', async () => {
    const rawData = {
      recipientEmail: 'auth-test@modesthumanbrands.com',
      otpCode: '904512',
      expiresIn: '10 minutes',
      tracking: {
        emailId: 'email-ssr-otp-789',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // Content verification
    expect(html).toContain('904512')
    expect(html).toContain('auth-test@modesthumanbrands.com')
    expect(html).toContain('10 minutes')

    // Honeypot trap link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-otp-789')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-otp-789')
  })
})
