<script setup lang="ts">
import { Html, Head, Preview, Body, Container, Section, Row, Column, Img, Text, Link, Button, Hr, Tailwind } from '@vue-email/components'

defineProps<{
  recipientName: string
  categoryName: string
  ctaUrl: string
  unsubscribeUrl: string
  portfolioItems: { imageUrl: string; linkUrl: string; alt: string }[]
  organizationName: string
  organizationPhone: string
  organizationAddress: string
  organizationWebsite: string
  organizationEpisodeUrl: string
  organizationLogoFull: string
  organizationLogoSimple: string
  organizationColorPrimary: string
  organizationFont: string
  organizationSocialWhatsapp: string
  organizationSocialInstagram: string
  organizationSocialFacebook: string
  organizationSocialLinkedin: string
  organizationSocialYoutube: string
}>()
</script>

<template>
  <Html>
    <Head />
    <Preview>High-resolution {{ categoryName }} studio production by {{ organizationName }}</Preview>

    <Tailwind :config="{ theme: { extend: { colors: { primary: organizationColorPrimary } } } }">
      <Body :style="{ fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif` }" class="m-0 p-0 bg-white text-gray-800">
        <Container class="mx-auto w-full max-w-[600px] min-w-[300px] p-4">
          <!-- PURE CODE GRADIENT HEADER -->
          <Section class="mb-6">
            <div class="h-4 w-full rounded bg-primary" :style="{ background: `linear-gradient(90deg, #111827 0%, ${organizationColorPrimary} 100%)` }"></div>
          </Section>

          <!-- LOGO -->
          <Section class="mb-6 text-center">
            <Img :src="organizationLogoFull" :alt="organizationName" width="80" class="inline-block h-auto border-0" />
          </Section>

          <!-- PITCH COPY -->
          <Section class="mb-6">
            <Text class="m-0 mb-2 text-sm font-medium text-gray-700 leading-normal"> Hi {{ recipientName }}, </Text>
            <Text class="m-0 text-sm font-medium text-gray-700 leading-relaxed">
              We are <Link :href="organizationWebsite" target="_blank" class="text-gray-900 underline font-semibold">{{ organizationName }}</Link
              >. We specialize in <strong class="capitalize">{{ categoryName }}</strong> photography and videography delivering crisp, high-resolution
              <Link :href="`${organizationWebsite}/#featured-photos`" target="_blank" class="text-gray-900 underline"> photos</Link> and short-form
              <Link :href="`${organizationWebsite}/#video-gallery`" target="_blank" class="text-gray-900 underline">videos </Link>
              for e-commerce, social media, and advertising. Whether on-location or in-studio, our full production services ensure top-quality assets. Here is our recent work:
            </Text>
          </Section>

          <!-- 2x4 PORTFOLIO GRID (Strictly constrained to 132px to protect Outlook Word Engine) -->
          <Section class="mb-4">
            <Row class="mb-2">
              <Column v-for="(item, idx) in portfolioItems.slice(0, 4)" :key="`r1-${idx}`" class="w-1/4 pr-2 align-top">
                <Link :href="item.linkUrl" target="_blank">
                  <Img :src="item.imageUrl" :alt="item.alt" width="132" class="block w-full max-w-[132px] h-auto rounded object-cover border-0" />
                </Link>
              </Column>
            </Row>
            <Row>
              <Column v-for="(item, idx) in portfolioItems.slice(4, 8)" :key="`r2-${idx}`" class="w-1/4 pr-2 align-top">
                <Link :href="item.linkUrl" target="_blank">
                  <Img :src="item.imageUrl" :alt="item.alt" width="132" class="block w-full max-w-[132px] h-auto rounded object-cover border-0" />
                </Link>
              </Column>
            </Row>
          </Section>

          <!-- CALL TO ACTION -->
          <Section class="mb-8 text-center">
            <Text class="m-0 mb-4 text-sm font-medium text-gray-700 text-left leading-normal">
              We would appreciate a brief call to discuss strategies for enhancing your visual marketing campaigns. Please advise on your availability.
            </Text>
            <Link :href="ctaUrl" class="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white no-underline inline-block"> Book Strategy Call </Link>
          </Section>

          <Hr class="border-gray-200 my-8" />

          <!-- BRAND FOOTER -->
          <Section class="text-center mb-4">
            <Link :href="organizationWebsite" target="_blank" class="inline-block no-underline">
              <Img :src="organizationLogoSimple" :alt="organizationName" width="40" height="40" class="block w-10 h-10 mx-auto border-0" />
            </Link>
            <Text class="m-0 mt-2 text-lg font-semibold text-gray-900">
              {{ organizationName }}
            </Text>
          </Section>

          <!-- METADATA & COMPLIANCE -->
          <Section class="text-center mb-6">
            <Text class="m-0 text-xs text-gray-500 leading-normal">
              {{ organizationAddress }}<br />
              <span v-if="organizationPhone">Phone: {{ organizationPhone }}</span>
            </Text>
            <Text class="m-0 mt-2 text-xs text-gray-500">
              <Link :href="organizationWebsite" target="_blank" class="text-gray-500 underline">VISIT WEBSITE</Link>
              <span class="text-gray-300 mx-1"> | </span>
              <Link :href="organizationEpisodeUrl" target="_blank" class="text-gray-500 underline">VISIT EPISODE</Link>
              <span class="text-gray-300 mx-1"> | </span>
              <Link :href="unsubscribeUrl" target="_blank" class="text-gray-500 underline">UNSUBSCRIBE</Link>
            </Text>
          </Section>

          <!-- SOCIAL ICONS -->
          <Section class="text-center">
            <Link v-if="organizationSocialWhatsapp" :href="organizationSocialWhatsapp" target="_blank" class="inline-block mx-2">
              <Img
                src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/WhatsApp_black.png"
                width="20"
                height="20"
                alt="WhatsApp"
                class="block w-5 h-5 border-0" />
            </Link>
            <Link v-if="organizationSocialInstagram" :href="organizationSocialInstagram" target="_blank" class="inline-block mx-2">
              <Img
                src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/Instagram_black.png"
                width="20"
                height="20"
                alt="Instagram"
                class="block w-5 h-5 border-0" />
            </Link>
            <Link v-if="organizationSocialFacebook" :href="organizationSocialFacebook" target="_blank" class="inline-block mx-2">
              <Img
                src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/Facebook_black.png"
                width="20"
                height="20"
                alt="Facebook"
                class="block w-5 h-5 border-0" />
            </Link>
            <Link v-if="organizationSocialLinkedin" :href="organizationSocialLinkedin" target="_blank" class="inline-block mx-2">
              <Img
                src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/LinkedIN_black.png"
                width="20"
                height="20"
                alt="LinkedIn"
                class="block w-5 h-5 border-0" />
            </Link>
            <Link v-if="organizationSocialYoutube" :href="organizationSocialYoutube" target="_blank" class="inline-block mx-2">
              <Img
                src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/Youtube_black.png"
                width="20"
                height="20"
                alt="YouTube"
                class="block w-5 h-5 border-0" />
            </Link>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
