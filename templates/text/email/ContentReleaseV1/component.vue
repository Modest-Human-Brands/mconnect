<script setup lang="ts">
import { computed } from 'vue'
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Hr, Link } from '@vue-email/components'

const props = defineProps<{
  recipientName: string
  recipientEmail: string
  emailSubject: string
  contentBadge: string
  contentTitle: string
  contentMeta: string
  contentImage: string
  contentExcerpt: string
  ctaLabel: string
  ctaUrl: string
  honeypotUrl: string
  trackingPixelUrl: string
  unsubscribeUrl: string
  organizationName: string
  organizationPhone: string
  organizationAddress: string
  organizationWebsite: string
  organizationLogo: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationFont: string
  organizationSocialWhatsapp: string
  organizationSocialInstagram: string
  organizationSocialFacebook: string
  organizationSocialLinkedin: string
  organizationSocialYoutube: string
}>()

const isValidHex = (val: unknown): val is string => typeof val === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)

const primaryColor = computed(() => (isValidHex(props.organizationColorPrimary) ? props.organizationColorPrimary : '#111827'))
const accentColor = computed(() => (isValidHex(props.organizationColorAccent) ? props.organizationColorAccent : primaryColor.value))

const tailwindConfig = computed(() => ({
  theme: {
    extend: {
      colors: {
        primary: primaryColor.value,
        accent: accentColor.value,
      },
    },
  },
}))
</script>

<template>
  <Tailwind :config="tailwindConfig">
    <Html lang="en">
      <Head />

      <Body
        :style="{
          fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif`,
        }"
        class="m-0 p-0 bg-white">
        <Container class="mx-auto w-full max-w-[600px] my-10 bg-white">
          <!-- BADGE -->
          <Section class="pt-10 pb-3 px-6 text-center bg-white">
            <Text class="m-0 text-2xl font-light tracking-wide text-center" :style="{ color: accentColor }">
              {{ contentBadge || 'New Release' }}
            </Text>

            <!-- CHEVRON -->
            <div class="mt-2 text-center leading-none inline-block" :style="{ color: accentColor }">
              <svg width="22" height="15" viewBox="0 0 22 15" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle">
                <path d="M2 2L11 8L20 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M2 7L11 13L20 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </Section>

          <!-- TITLE -->
          <Section class="px-8 pb-3 text-center bg-white">
            <Text class="m-0 text-2xl md:text-3xl font-semibold text-gray-900 leading-snug tracking-tight">
              {{ contentTitle }}
            </Text>
          </Section>

          <!-- META -->
          <Section v-if="contentMeta" class="px-6 pb-6 text-center bg-white">
            <Text class="m-0 text-xs text-gray-400 font-normal tracking-wide">
              {{ contentMeta }}
            </Text>
          </Section>

          <!-- IMAGE -->
          <Section v-if="contentImage" class="p-0 m-0 w-full bg-white">
            <Link :href="ctaUrl" target="_blank" class="block w-full no-underline">
              <Img :src="contentImage" :alt="contentTitle" width="600" class="block w-full h-auto object-cover border-0" />
            </Link>
          </Section>

          <!-- EXCERPT & CTA BUTTON -->
          <Section class="pt-8 pb-10 px-8 text-center bg-white">
            <Text v-if="contentExcerpt" class="m-0 text-sm text-gray-600 leading-relaxed max-w-[460px] mx-auto mb-8 font-normal">
              {{ contentExcerpt }}
            </Text>

            <Button :href="ctaUrl" class="rounded px-8 py-3 text-sm font-semibold text-white no-underline inline-block shadow-sm tracking-wide" :style="{ backgroundColor: accentColor }">
              {{ ctaLabel || 'Read More' }}
            </Button>
          </Section>

          <Hr class="border-gray-200 m-0" />

          <!-- FOOTER TABLE -->
          <Section class="py-8 px-6 text-center bg-white">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="w-full">
              <tbody>
                <tr>
                  <td class="w-1/3 align-middle text-left pr-2" style="width: 33.33%; vertical-align: middle; text-align: left; padding-right: 8px">
                    <Text class="m-0 text-[11px] text-gray-500 leading-relaxed">
                      {{ organizationAddress }}
                    </Text>
                    <Text v-if="organizationPhone" class="m-0 text-[11px] text-gray-500 leading-relaxed mt-0.5">
                      {{ organizationPhone }}
                    </Text>
                  </td>

                  <td class="w-1/3 align-middle text-center px-1" style="width: 33.33%; vertical-align: middle; text-align: center; padding-left: 4px; padding-right: 4px">
                    <Text class="m-0 text-[11px] text-gray-400 font-medium mb-1.5"> Connect With Us </Text>
                    <div>
                      <Link v-if="organizationSocialFacebook" :href="organizationSocialFacebook" target="_blank" class="inline-block mx-1 no-underline">
                        <Img
                          src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/Facebook_black.png"
                          width="16"
                          height="16"
                          alt="Facebook"
                          class="inline-block w-4 h-4 border-0" />
                      </Link>
                      <Link v-if="organizationSocialInstagram" :href="organizationSocialInstagram" target="_blank" class="inline-block mx-1 no-underline">
                        <Img
                          src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/Instagram_black.png"
                          width="16"
                          height="16"
                          alt="Instagram"
                          class="inline-block w-4 h-4 border-0" />
                      </Link>
                      <Link v-if="organizationSocialYoutube" :href="organizationSocialYoutube" target="_blank" class="inline-block mx-1 no-underline">
                        <Img
                          src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/Youtube_black.png"
                          width="16"
                          height="16"
                          alt="YouTube"
                          class="inline-block w-4 h-4 border-0" />
                      </Link>
                      <Link v-if="organizationSocialLinkedin" :href="organizationSocialLinkedin" target="_blank" class="inline-block mx-1 no-underline">
                        <Img
                          src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/LinkedIN_black.png"
                          width="16"
                          height="16"
                          alt="LinkedIn"
                          class="inline-block w-4 h-4 border-0" />
                      </Link>
                      <Link v-if="organizationSocialWhatsapp" :href="organizationSocialWhatsapp" target="_blank" class="inline-block mx-1 no-underline">
                        <Img
                          src="https://raw.githubusercontent.com/gauravghongde/social-icons/refs/heads/master/PNG/Black/WhatsApp_black.png"
                          width="16"
                          height="16"
                          alt="WhatsApp"
                          class="inline-block w-4 h-4 border-0" />
                      </Link>
                    </div>
                  </td>

                  <td class="w-1/3 align-middle text-right pl-2" style="width: 33.33%; vertical-align: middle; text-align: right; padding-left: 8px">
                    <Link :href="organizationWebsite" target="_blank" class="text-[11px] text-gray-600 font-medium no-underline hover:underline inline-block"> Visit website &rarr; </Link>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text class="m-0 mt-6 text-[10px] text-gray-400">
              &copy; {{ new Date().getFullYear() }} {{ organizationName }}. All rights reserved.
              <span class="mx-1">&bull;</span>
              <Link :href="`${unsubscribeUrl}?email=${recipientEmail}`" target="_blank" class="text-gray-400 underline"> Unsubscribe </Link>
            </Text>
          </Section>

          <!-- HONEYPOT TRAP LINK -->
          <Link v-if="honeypotUrl" :href="honeypotUrl" style="display: none; max-height: 0px; overflow: hidden; opacity: 0" aria-hidden="true"> &zwnj; </Link>

          <!-- TELEMETRY PIXEL -->
          <Img v-if="trackingPixelUrl" :src="trackingPixelUrl" width="1" height="1" alt="" class="block hidden opacity-0 invisible" />
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>
