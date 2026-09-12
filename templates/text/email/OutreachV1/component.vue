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

const categoryLabel = computed(() => (props.categoryName ? props.categoryName.charAt(0).toUpperCase() + props.categoryName.slice(1) : ''))

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
  <Tailwind :config="{ theme: { extend: { colors: { primary: organizationColorPrimary } } } }">
    <Html>
      <Head />
      <Preview>{{ heroHeadline || `Elevating ${categoryName} solutions with ${organizationName}` }}</Preview>

      <Body :style="{ fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif` }" class="m-0 p-0 bg-white">
        <Container class="mx-auto w-full min-w-[600px] p-6 bg-white">
          <!-- PURE CODE GRADIENT HEADER -->
          <Section class="mb-6">
            <Section class="h-4 w-full rounded" :style="{ background: `linear-gradient(90deg, #111827 0%, ${organizationColorPrimary} 100%)` }" />
          </Section>

          <!-- LOGO -->
          <Section class="mb-8 text-center">
            <Img :src="organizationLogo" :alt="organizationName" width="80" class="inline-block h-auto border-0" />
          </Section>

          <!-- PITCH COPY -->
          <Section class="mb-6 text-left">
            <Text class="m-0 mb-4 text-base font-semibold text-gray-900 leading-normal"> Hey {{ recipientName }}</Text>
            <Text class="m-0 text-sm text-gray-600 leading-relaxed">
              {{ pitchMessage }}
            </Text>
          </Section>

          <!-- HERO SECTION -->
          <Section v-if="heroHeadline || heroImageUrl" class="mb-6">
            <Text v-if="heroHeadline" class="m-0 mb-4 text-base sm:text-2xl font-black text-gray-900 leading-tight">
              {{ heroHeadline }}
            </Text>
            <Img
              v-if="heroImageUrl"
              :src="heroImageUrl"
              :alt="heroHeadline || 'Hero banner'"
              width="552"
              class="block w-full h-auto rounded shadow-sm object-cover"
              :style="{ border: '1px solid #F3F4F6' }" />
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
                class="rounded px-7 py-3 text-sm font-bold text-white no-underline inline-block shadow-md tracking-wide"
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
                        class="rounded px-6 py-3 text-sm font-bold text-white no-underline inline-block shadow-md tracking-wide"
                        :style="{ backgroundColor: organizationColorAccent }">
                        {{ computedCtas[0].label }}
                      </Button>
                    </td>
                    <td class="pl-2">
                      <Button
                        :href="computedCtas[1].url"
                        class="rounded px-6 py-3 text-sm font-bold text-white no-underline inline-block shadow-md tracking-wide"
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

          <!-- SHOWCASE SECTION (1 col on mobile, 2 col from sm: up) -->
          <Section v-if="featuredItems && featuredItems.length" class="mb-8">
            <Section class="mb-4">
              <Text v-if="sectionPretitle" class="m-0 text-xs font-mono font-bold tracking-wider uppercase text-gray-400">
                {{ sectionPretitle }}
              </Text>
              <Text class="m-0 text-xs sm:text-xl font-bold text-gray-900 mt-1">
                {{ sectionTitle || 'Explore Solutions' }}
              </Text>
              <Text v-if="sectionDescription" class="m-0 text-xs text-gray-500 mt-1 leading-relaxed">
                {{ sectionDescription }}
              </Text>
            </Section>

            <Row v-for="(row, rIdx) in chunkedPortfolio" :key="`row-${rIdx}`" class="block sm:table w-full mb-4">
              <Column v-for="(item, cIdx) in row" :key="`col-${cIdx}`" :class="['w-full sm:w-1/2 align-top block sm:table-cell mb-3 sm:mb-0', cIdx === 0 ? 'sm:pr-1.5' : 'sm:pl-1.5']">
                <Section class="rounded border border-gray-200 overflow-hidden bg-white shadow-sm">
                  <Link :href="item.linkUrl" target="_blank" class="block no-underline">
                    <Img :src="item.imageUrl" :alt="item.alt || item.title || 'Work sample'" width="268" class="block w-full h-auto sm:max-w-[268px] object-cover border-0" />
                  </Link>
                  <Section class="p-3">
                    <Row>
                      <Column align="left" valign="middle">
                        <Text class="m-0 text-xs font-bold text-gray-900 leading-snug">
                          {{ item.title || 'Project Showcase' }}
                        </Text>
                      </Column>
                      <Column align="right" valign="middle" class="whitespace-nowrap pl-2">
                        <Link :href="item.linkUrl" target="_blank" class="text-xs font-bold no-underline text-gray-500 hover:text-gray-900">
                          {{ item.actionLabel || 'View →' }}
                        </Link>
                      </Column>
                    </Row>
                    <Text v-if="item.description" class="m-0 text-[11px] text-gray-500 mt-1 leading-snug">
                      {{ item.description }}
                    </Text>
                  </Section>
                </Section>
              </Column>
              <Column v-if="row.length === 1" class="hidden sm:table-cell sm:w-1/2" />
            </Row>
          </Section>

          <Hr class="border-gray-200 my-8" />

          <!-- BRAND FOOTER -->
          <Section class="text-center mb-4">
            <Link :href="organizationWebsite" target="_blank" class="inline-block no-underline">
              <Img :src="organizationLogo" :alt="organizationName" width="40" height="40" class="block w-10 h-10 mx-auto border-0" />
            </Link>
            <Text class="m-0 mt-2 text-lg font-semibold text-gray-900">
              {{ organizationName }}
            </Text>
          </Section>

          <!-- METADATA & COMPLIANCE -->
          <Section class="text-center mb-6">
            <Text class="m-0 text-xs text-gray-500 leading-normal">
              {{ organizationAddress }}
            </Text>
            <Text v-if="organizationPhone" class="m-0 text-xs text-gray-500 leading-normal">Phone: {{ organizationPhone }}</Text>
            <Text class="m-0 mt-2 text-xs text-gray-500">
              <Link :href="organizationWebsite" target="_blank" class="text-gray-500 underline">VISIT WEBSITE</Link>
              &nbsp;|&nbsp;
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
    </Html>
  </Tailwind>
</template>
