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

import Component from '~/templates/text/email/ProjectDeliveryV1/component.vue'
import '~/templates/text/email/ProjectDeliveryV1/index'

describe('Project Delivery Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('project-delivery')
  })

  it('generates click-wrapped project links, dynamic pixel, and honeypot with explicit tracking parameters', () => {
    const rawData = {
      recipient: { name: 'David Clark' },
      projectName: 'Full Production Master',
      completionDate: new Date('2026-09-01'),
      deliveryNotes: 'All master files, color grades, and deliverables are uploaded.',
      projectLinks: [
        {
          title: 'Master Video Export (ProRes)',
          url: 'https://cdn.modesthumanbrands.com/deliveries/master.mov',
          description: '4K DCI master format.',
        },
        {
          title: 'Still Stills Archive (ZIP)',
          url: 'https://cdn.modesthumanbrands.com/deliveries/stills.zip',
          description: 'Full resolution RAW and graded JPEG stills.',
        },
      ],
      tracking: {
        emailId: 'email-delivery-test-456',
        baseUrl: 'https://connect.modesthumanbrands.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // Canonical fields
    expect(payload.recipientName).toBe('David Clark')
    expect(payload.projectName).toBe('Full Production Master')
    expect(payload.deliveryNotes).toContain('master files')

    // Click-wrapped links in projectLinks array
    expect(payload.projectLinks.length).toBe(2)
    const firstLink = payload.projectLinks[0]
    expect(firstLink.url).toContain('https://connect.modesthumanbrands.com/api/track/click?')
    expect(firstLink.url).toContain('e=email-delivery-test-456')

    const urlParam = new URL(firstLink.url).searchParams.get('url')
    expect(urlParam).toBe('https://cdn.modesthumanbrands.com/deliveries/master.mov?ref=mail-delivery&utm_source=mconnect&utm_medium=email')

    // Dynamic telemetry pixel and honeypot trap link
    expect(payload.trackingPixelUrl).toBe('https://connect.modesthumanbrands.com/api/track/open?e=email-delivery-test-456')
    expect(payload.honeypotUrl).toBe('https://connect.modesthumanbrands.com/api/track/trap?e=email-delivery-test-456')

    // Required organization branding keys
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
      projectLinks: [
        {
          title: 'Online Preview Gallery',
          url: 'https://modesthumanbrands.com/preview/sample',
        },
      ],
      tracking: undefined,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.projectLinks[0].url).toContain(`e=${defaultEmailId}`)
    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('keeps hash link as # without wrapping when link URL is #', () => {
    const rawData = {
      ...mocks.templateConfig.placeholders,
      projectLinks: [{ title: 'Placeholder Item', url: '#' }],
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    expect(payload.projectLinks[0].url).toBe('#')
  })

  it('renders compiled HTML with project links, buttons, honeypot trap, and telemetry pixel', async () => {
    const rawData = {
      recipient: { name: 'SSR Client' },
      projectName: 'Autumn Commercial',
      completionDate: new Date('2026-09-02'),
      deliveryNotes: 'Files ready for review.',
      projectLinks: [
        {
          title: 'Final Assets Link',
          url: 'https://modesthumanbrands.com/downloads/assets',
          description: 'High-res package',
        },
      ],
      tracking: {
        emailId: 'email-ssr-delivery-88',
        baseUrl: 'http://localhost:3000',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const props = mocks.templateConfig.transformPayload(rawData)
    const app = createSSRApp({ render: () => h(Component, props) })
    const html = await renderToString(app)

    // Deliverables button with click tracking
    expect(html).toContain('http://localhost:3000/api/track/click?')
    expect(html).toContain('e=email-ssr-delivery-88')
    expect(html).toContain('Final Assets Link')
    expect(html).toContain('Open Link')

    // Invisible honeypot trap link
    expect(html).toContain('http://localhost:3000/api/track/trap?e=email-ssr-delivery-88')

    // Telemetry open pixel
    expect(html).toContain('http://localhost:3000/api/track/open?e=email-ssr-delivery-88')
  })
})
