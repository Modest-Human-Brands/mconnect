<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind } from '@vue-email/components'

defineProps<{
  recipientName: string
  bodyContent: string
  dataOfIssue: string
  signerName: string
  signerTitle: string
  certificateUrl: string
  organization: {
    id: string
    name: string
    website: string
    branding: {
      logo: string
      color: {
        primary: string
        accent: string
      }
      font: string
    }
    socials?: Record<string, any>
  }
}>()
</script>

<template>
  <Html>
    <Head />
    <Tailwind :config="{ theme: { extend: { colors: { primary: organization.branding.color.primary } } } }">
      <Body :style="{ fontFamily: `'${organization.branding.font}', system-ui, sans-serif` }" class="m-0 p-0">
        <Section :style="{ backgroundColor: organization.branding.color.primary }">
          <Container class="mx-auto w-full max-w-[600px]">
            <Section class="px-6 py-12">
              <Section class="p-10 text-center shadow-2xl border-t-4" :style="{ backgroundColor: '#ffffff', borderColor: organization.branding.color.accent || '#1a1a1a' }">
                <Img :src="organization.branding.logo" :alt="organization.name" width="120" class="mx-auto mb-6" />

                <Text class="m-0 mb-2 text-sm font-bold tracking-widest uppercase text-gray-500"> Certificate of Completion </Text>

                <Text class="m-0 text-2xl font-bold text-gray-800 leading-tight mb-4"> Congratulations, {{ recipientName }}! </Text>

                <Text class="m-0 mb-6 text-base text-gray-600 leading-relaxed text-center">
                  {{ bodyContent }}
                </Text>

                <Section class="mx-auto text-center my-4">
                  <Text class="m-0 text-xs text-gray-400 font-medium uppercase tracking-wider"> Issued On: {{ dataOfIssue }} </Text>
                </Section>

                <Section class="text-center my-6">
                  <Button class="text-white font-bold text-sm px-6 py-3 rounded-md no-underline inline-block" :style="{ backgroundColor: organization.branding.color.primary }" :href="certificateUrl">
                    Download Certificate PDF
                  </Button>
                </Section>

                <Section class="mt-8 pt-6 border-t border-gray-100 mx-auto text-center">
                  <Text class="m-0 font-bold text-gray-800 leading-none mb-1">
                    {{ signerName }}
                  </Text>
                  <Text class="m-0 text-xs text-gray-400 uppercase tracking-wider"> {{ signerTitle }}, {{ organization.name }} </Text>
                </Section>
              </Section>
            </Section>
          </Container>
        </Section>
      </Body>
    </Tailwind>
  </Html>
</template>
