<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Tailwind, Hr } from '@vue-email/components'

defineProps<{
  recipientEmail: string
  otpCode: string
  expiresIn: string
  organizationName: string
  organizationWebsite: string
  organizationLogo: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationFont: string
}>()
</script>

<template>
  <Html>
    <Head />
    <Tailwind
      :config="{
        theme: {
          extend: {
            colors: {
              primary: organizationColorPrimary,
            },
            fontFamily: {
              sans: [organizationFont || 'ui-sans-serif', 'system-ui', 'sans-serif'],
              mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
          },
        },
      }">
      <Body class="m-0 p-0 bg-white font-sans">
        <Container class="mx-auto w-full max-w-[480px] my-12">
          <Section class="p-8 border border-gray-200 rounded-lg">
            <Section class="mb-6">
              <Img :src="organizationLogo" :alt="organizationName" width="80" class="block mx-auto mb-6" />
              <Text class="m-0 text-xl font-bold text-gray-900 tracking-tight mb-2"> Log in to {{ organizationName }} </Text>
              <Text class="m-0 text-sm text-gray-500">
                You requested a login code for <span class="font-medium text-gray-700">{{ recipientEmail }} </span>.
              </Text>
            </Section>
            <Section class="bg-gray-50 border border-gray-100 rounded text-center py-6 my-6">
              <Text class="m-0 text-[32px] font-bold text-gray-900 tracking-[0.2em] leading-none font-mono">
                {{ otpCode }}
              </Text>
            </Section>

            <Section class="mb-6">
              <Text class="m-0 text-sm text-gray-600 mb-4">
                Please enter this code to complete your login. This code will expire in <strong>{{ expiresIn }}</strong
                >.
              </Text>
            </Section>

            <Hr class="border-gray-200 my-6" />

            <Section class="text-center">
              <Text class="m-0 text-xs text-gray-400 leading-relaxed">
                If you didn't attempt to log in, someone else may have entered your email address by mistake. You can safely ignore this email.
              </Text>
              <Text class="m-0 text-xs text-gray-400 mt-4">
                &copy; {{ new Date().getFullYear() }} <a :href="organizationWebsite" class="text-gray-400 hover:text-gray-600 no-underline">{{ organizationName }}</a
                >.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
