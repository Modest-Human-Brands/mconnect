<script setup lang="ts">
import { computed } from 'vue'
import { Html, Head, Preview, Body, Container, Section, Row, Column, Img, Text, Link, Button, Hr, Tailwind } from '@vue-email/components'

interface PortfolioItem {
  imageUrl: string
  linkUrl: string
  alt?: string
  title?: string
  description?: string
  actionLabel?: string
}

const props = defineProps<{
  recipientName: string
  categoryName: string
  heroHeadline?: string
  heroImageUrl?: string
  pitchMessage?: string
  ctaText?: string
  ctaButtonText?: string
  ctaUrl?: string
  ctaButtons?: { label: string; url: string }[]
  sectionPretitle?: string
  sectionTitle?: string
  sectionDescription?: string
  trackingPixelUrl?: string
  honeypotUrl?: string
  unsubscribeUrl: string
  featuredItems: PortfolioItem[]
  organizationName: string
  organizationPhone?: string
  organizationAddress: string
  organizationWebsite: string
  organizationEpisodeUrl?: string
  organizationLogo: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationFont: string
  organizationSocialWhatsapp?: string
  organizationSocialInstagram?: string
  organizationSocialFacebook?: string
  organizationSocialLinkedin?: string
  organizationSocialYoutube?: string
}>()

const computedCtas = computed(() => {
  if (props.ctaButtons && props.ctaButtons.length > 0) {
    return props.ctaButtons.slice(0, 2)
  }
  if (props.ctaUrl && props.ctaUrl !== '#') {
    return [{ label: props.ctaButtonText || 'Book Strategy Call', url: props.ctaUrl }]
  }
  return []
})

const chunkedPortfolio = computed(() => {
  const items = props.featuredItems || []
  const chunks: (typeof items)[] = []
  for (let i = 0; i < items.length; i += 2) {
    chunks.push(items.slice(i, i + 2))
  }
  return chunks
})
</script>

<template>
  <Html>
    <Head />
    <Preview>{{ heroHeadline || `Elevating ${categoryName} solutions with ${organizationName}` }}</Preview>

    <Tailwind :config="{ theme: { extend: { colors: { primary: organizationColorPrimary } } } }">
      <Body :style="{ fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif` }" class="m-0 p-0 bg-white text-gray-800">
        <Container class="mx-auto w-full max-w-[600px] min-w-[300px] p-6">
          <!-- PURE CODE GRADIENT HEADER -->
          <Section class="mb-6">
            <div class="h-4 w-full rounded bg-primary" :style="{ background: `linear-gradient(90deg, #111827 0%, ${organizationColorPrimary} 100%)` }"></div>
          </Section>

          <!-- LOGO -->
          <Section class="mb-8 text-center">
            <Img :src="organizationLogo" :alt="organizationName" width="80" class="inline-block h-auto border-0" />
          </Section>

          <!-- PITCH COPY -->
          <Section class="mb-6 text-left">
            <Text class="m-0 mb-4 text-base font-semibold text-gray-900 leading-normal"> Hey {{ recipientName }} 👋 </Text>
            <Text v-if="pitchMessage" class="m-0 text-sm text-gray-600 leading-relaxed">
              {{ pitchMessage }}
            </Text>
            <Text v-else class="m-0 text-sm text-gray-600 leading-relaxed">
              We are <Link :href="organizationWebsite" target="_blank" class="text-gray-900 underline font-semi-bold">{{ organizationName }}</Link
              >. We specialize in delivering high-impact <strong class="capitalize text-gray-900">{{ categoryName }}</strong> solutions tailored to help ambitious brands stand out, scale their
              presence, and engage audiences effectively.
            </Text>
          </Section>

          <!-- HERO SECTION -->
          <Section v-if="heroHeadline || heroImageUrl" class="mb-6">
            <Text v-if="heroHeadline" class="m-0 mb-4 text-2xl font-black text-gray-900 leading-tight">
              {{ heroHeadline }}
            </Text>
            <div v-if="heroImageUrl" class="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
              <Img :src="heroImageUrl" :alt="heroHeadline || 'Hero banner'" width="552" class="block w-full h-auto rounded-xl object-cover border-0" />
            </div>
          </Section>

          <!-- HERO CTA BUTTONS (0, 1, OR 2 DYNAMIC BUTTONS) -->
          <Section v-if="computedCtas.length > 0" class="mb-10 text-center">
            <Text v-if="ctaText" class="m-0 mb-4 text-sm text-gray-600 text-left leading-normal">
              {{ ctaText }}
            </Text>

            <!-- 1 Button -> Accent color -->
            <template v-if="computedCtas.length === 1">
              <Button
                :href="computedCtas[0].url"
                class="rounded-lg px-7 py-3 text-sm font-bold text-white no-underline inline-block shadow-md tracking-wide"
                :style="{ backgroundColor: organizationColorAccent || organizationColorPrimary }">
                {{ computedCtas[0].label }}
              </Button>
            </template>

            <!-- 2 Buttons -> Button 1 Accent color, Button 2 Primary color -->
            <template v-else-if="computedCtas.length === 2">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" class="mx-auto">
                <tbody>
                  <tr>
                    <td class="pr-2">
                      <Button
                        :href="computedCtas[0].url"
                        class="rounded-lg px-6 py-3 text-sm font-bold text-white no-underline inline-block shadow-md tracking-wide"
                        :style="{ backgroundColor: organizationColorAccent }">
                        {{ computedCtas[0].label }}
                      </Button>
                    </td>
                    <td class="pl-2">
                      <Button
                        :href="computedCtas[1].url"
                        class="rounded-lg px-6 py-3 text-sm font-bold text-white no-underline inline-block shadow-md tracking-wide"
                        :style="{ backgroundColor: organizationColorPrimary }">
                        {{ computedCtas[1].label }}
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </Section>

          <Hr class="border-gray-200 my-8" />

          <!-- 2-COLUMN SHOWCASE SECTION -->
          <Section v-if="featuredItems && featuredItems.length" class="mb-8">
            <div class="mb-4">
              <Text v-if="sectionPretitle" class="m-0 text-xs font-mono font-bold tracking-wider uppercase text-gray-400">
                {{ sectionPretitle }}
              </Text>
              <Text class="m-0 text-xl font-bold text-gray-900 mt-1">
                {{ sectionTitle || 'Explore Solutions' }}
              </Text>
              <Text v-if="sectionDescription" class="m-0 text-xs text-gray-500 mt-1 leading-relaxed">
                {{ sectionDescription }}
              </Text>
            </div>

            <Row v-for="(row, rIdx) in chunkedPortfolio" :key="`row-${rIdx}`" class="mb-4">
              <Column v-for="(item, cIdx) in row" :key="`col-${cIdx}`" class="w-1/2 align-top" :style="{ paddingRight: cIdx === 0 ? '6px' : '0px', paddingLeft: cIdx === 1 ? '6px' : '0px' }">
                <div class="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                  <Link :href="item.linkUrl" target="_blank" class="block no-underline">
                    <Img :src="item.imageUrl" :alt="item.alt || item.title || 'Work sample'" width="268" class="block w-full max-w-[268px] h-auto object-cover border-0" />
                  </Link>
                  <div class="p-3">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tbody>
                        <tr>
                          <td align="left" valign="middle">
                            <Text class="m-0 text-xs font-bold text-gray-900 leading-snug">
                              {{ item.title || 'Project Showcase' }}
                            </Text>
                          </td>
                          <td align="right" valign="middle" class="whitespace-nowrap pl-2">
                            <Link :href="item.linkUrl" target="_blank" class="text-xs font-bold no-underline text-gray-500 hover:text-gray-900">
                              {{ item.actionLabel || 'View →' }}
                            </Link>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <Text v-if="item.description" class="m-0 text-[11px] text-gray-500 mt-1 leading-snug">
                      {{ item.description }}
                    </Text>
                  </div>
                </div>
              </Column>
              <Column v-if="row.length === 1" class="w-1/2" />
            </Row>
          </Section>

          <Hr class="border-gray-200 my-8" />

          <!-- BRAND FOOTER -->
          <Section class="text-center mb-4">
            <Link :href="organizationWebsite" target="_blank" class="inline-block no-underline">
              <Img :src="organizationLogo" :alt="organizationName" width="40" height="40" class="block w-10 h-10 mx-auto border-0" />
            </Link>
            <Text class="m-0 mt-2 text-lg font-semi-bold text-gray-900">
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
              <template v-if="organizationEpisodeUrl">
                <span class="text-gray-300 mx-1"> | </span>
                <Link :href="organizationEpisodeUrl" target="_blank" class="text-gray-500 underline">VISIT EPISODE</Link>
              </template>
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

          <!-- HONEYPOT TRAP LINK -->
          <Link v-if="honeypotUrl" :href="honeypotUrl" style="display: none; max-height: 0px; overflow: hidden; opacity: 0" aria-hidden="true"> &zwnj; </Link>

          <!-- MCONNECT TELEMETRY PIXEL -->
          <Img v-if="trackingPixelUrl" :src="trackingPixelUrl" width="1" height="1" alt="" class="block hidden opacity-0 invisible" />
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
