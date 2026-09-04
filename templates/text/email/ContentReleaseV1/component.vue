<script setup lang="ts">
import { Html, Head, Preview, Body, Container, Section, Text, Tailwind, Img, Link, Font, Hr, Button } from '@vue-email/components'

defineProps<{
  recipientName: string
  recipientEmail: string
  emailSubject: string
  contentTitle: string
  contentImage: string
  ctaUrl: string
  unsubscribeUrl: string
  trackingPixelUrl?: string
  organizationName: string
  organizationWebsite: string
  organizationLogo: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationFont: string
}>()
</script>

<template>
  <Html lang="en">
    <Head>
      <Font
        font-family="Oxanium"
        fallback-font-family="Verdana"
        :web-font="{
          url: 'https://fonts.gstatic.com/s/oxanium/v19/RrQQboN_4yJ0JmiMe2zE0YBB.woff2',
          format: 'woff2',
        }"
        :font-weight="400"
        font-style="normal" />
      <title>{{ emailSubject }}</title>
    </Head>
    <Preview>{{ contentTitle }}</Preview>

    <Tailwind :config="{ theme: { extend: { colors: { primary: organizationColorPrimary } } } }">
      <Body :style="{ fontFamily: `'${organizationFont}', system-ui, sans-serif` }" class="m-0 p-0 bg-gray-50 text-gray-800">
        <Container class="mx-auto w-full max-w-[600px] min-w-[300px] p-6 bg-white shadow-xl mt-10 mb-10 border-t-4" :style="{ borderColor: organizationColorPrimary }">
          <!-- Logo -->
          <Section class="mb-6 text-center">
            <Link :href="organizationWebsite" target="_blank" class="inline-block">
              <Img :src="organizationLogo" :alt="organizationName" width="200" class="inline-block h-auto border-0 mx-auto" />
            </Link>
          </Section>

          <Hr class="border-gray-100 my-4" />

          <!-- Heading -->
          <Section class="mb-6 text-left">
            <Text class="m-0 mb-4 text-2xl font-bold text-gray-900 leading-tight">
              {{ emailSubject }}
            </Text>
            <Text class="m-0 text-base text-gray-600 leading-relaxed">
              Hello <strong>{{ recipientName }}</strong
              >, we have just published a new post we thought you'd like.
            </Text>
          </Section>

          <!-- Feature Image -->
          <Section class="mb-6">
            <Link :href="ctaUrl" target="_blank" class="block">
              <Img :src="contentImage" :alt="contentTitle" width="552" class="block w-full h-auto rounded object-cover border-0" />
            </Link>
          </Section>

          <!-- Content Details & Call to Action -->
          <Section class="mb-8">
            <Text class="m-0 mb-4 text-lg font-semibold text-gray-800 leading-snug">
              {{ contentTitle }}
            </Text>
            <Button :href="ctaUrl" class="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white no-underline inline-block"> Read More </Button>
          </Section>

          <Hr class="border-gray-100 my-6" />

          <!-- Footer -->
          <Section class="text-center">
            <Text class="m-0 text-xs text-gray-400"> Sent by {{ organizationName }} </Text>
            <Text class="m-0 mt-2 text-xs text-gray-400">
              <Link :href="`${unsubscribeUrl}?email=${recipientEmail}`" class="text-gray-400 underline">Unsubscribe</Link>
            </Text>
          </Section>

          <!-- MCONNECT TELEMETRY PIXEL -->
          <Img v-if="trackingPixelUrl" :src="trackingPixelUrl" width="1" height="1" alt="" class="block hidden opacity-0 invisible" />
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
