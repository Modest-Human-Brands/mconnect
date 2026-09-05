<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Hr, Link } from '@vue-email/components'

interface DeliveryLink {
  title: string
  url: string
  description?: string
}

defineProps<{
  recipientName: string
  projectName: string
  completionDate: string
  deliveryNotes: string
  projectLinks: DeliveryLink[]
  trackingPixelUrl?: string
  honeypotUrl?: string

  organizationName: string
  organizationWebsite: string
  organizationLogo: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationFont: string
}>()

const formatDate = (val: string | Date) => (val ? new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '')
</script>

<template>
  <Html>
    <Head />
    <Tailwind :config="{ theme: { extend: { colors: { primary: organizationColorPrimary } } } }">
      <Body :style="{ fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif` }" class="m-0 p-0 bg-white">
        <Container class="mx-auto w-full max-w-[600px] my-10">
          <Section class="bg-white p-10 border-t-4" :style="{ borderColor: organizationColorPrimary }">
            <!-- Header -->
            <Section class="mb-8 text-center">
              <Img :src="organizationLogo" :alt="organizationName" width="120" class="mx-auto mb-6" />
              <Text class="m-0 text-2xl font-black text-gray-900 leading-tight"> Your project is ready to review. </Text>
            </Section>

            <Hr class="border-gray-100 my-6" />

            <!-- Greeting & Details -->
            <Section class="mb-6">
              <Text class="m-0 text-base text-gray-800 font-medium mb-3"> Hi {{ recipientName }}, </Text>
              <Text class="m-0 text-sm text-gray-600 leading-relaxed mb-4">
                {{ deliveryNotes }}
              </Text>
              <Text class="m-0 text-xs text-gray-400 text-right pr-1">Officially delivered on: {{ formatDate(completionDate) }}</Text>
            </Section>

            <!-- Links Loop -->
            <Section v-if="projectLinks && projectLinks.length > 0" class="my-8">
              <Text class="m-0 mb-4 text-sm font-bold text-gray-800 border-b border-gray-100 pb-2"> Access Your Deliverables </Text>

              <div v-for="(link, index) in projectLinks" :key="index" class="mb-4">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tbody>
                    <tr>
                      <td align="left" valign="middle" class="pr-4">
                        <Text class="m-0 text-sm font-bold text-gray-900">{{ link.title }}</Text>
                        <Text v-if="link.description" class="m-0 text-xs text-gray-500 mt-0.5">{{ link.description }}</Text>
                      </td>
                      <td align="right" valign="middle" width="120">
                        <Button
                          class="px-4 py-2 rounded text-white font-semi-bold text-xs tracking-wide text-center inline-block no-underline whitespace-nowrap"
                          :style="{ backgroundColor: organizationColorPrimary }"
                          :href="link.url">
                          Open Link &rarr;
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Hr class="border-gray-100 my-8" />

            <!-- Footer Support -->
            <Section class="text-center">
              <Text class="m-0 text-xs text-gray-500 leading-relaxed mb-2">
                If you have any trouble accessing these files or need further revisions as per your contract, please reply to this email
              </Text>
              <Text class="m-0 text-xs text-gray-400 mt-4">
                &copy; {{ new Date().getFullYear() }} <a :href="organizationWebsite" class="underline text-gray-400 hover:text-gray-600">{{ organizationName }}</a
                >. All rights reserved.
              </Text>
            </Section>
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
