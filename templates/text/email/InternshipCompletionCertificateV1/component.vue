<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind } from '@vue-email/components'

defineProps<{
  recipientName: string
  recipientRole: string
  recipientScopeOfWork: string
  startDate: string | Date
  endDate: string | Date
  dataOfIssue: string
  signerName: string
  signerTitle: string
  certificateUrl: string
  organizationName: string
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
      <Body :style="{ fontFamily: `'${organizationFont}', system-ui, sans-serif` }" class="m-0 p-0">
        <Section>
          <Container class="mx-auto w-full max-w-[600px]">
            <Section class="px-6 py-12">
              <Section class="p-10 text-center shadow-2xl border-t-4" :style="{ backgroundColor: '#ffffff', borderColor: organizationColorAccent || '#1a1a1a' }">
                <Img :src="organizationLogo" :alt="organizationName" width="120" class="mx-auto mb-6" />

                <Text class="m-0 mb-2 text-sm font-bold tracking-widest uppercase text-gray-500"> Certificate of Completion </Text>

                <Text class="m-0 text-2xl font-bold text-gray-800 leading-tight mb-4"> Congratulations, {{ recipientName }}! </Text>

                <Text class="m-0 mb-6 text-base text-gray-600 leading-relaxed text-center">
                  This certificate acknowledges your outstanding contribution and dedication as a {{ recipientRole }} towards {{ recipientScopeOfWork }} during {{ formatDate(startDate) }} -
                  {{ formatDate(endDate) }}, showcasing your commitment to excellence and teamwork at {{ organizationName }}
                </Text>

                <Section class="mx-auto text-center my-4">
                  <Text class="m-0 text-xs text-gray-400 font-medium uppercase tracking-wider"> Issued On: {{ formatDate(dataOfIssue) }} </Text>
                </Section>

                <Section class="text-center my-6">
                  <Button class="text-white font-bold text-sm px-6 py-3 rounded-md no-underline inline-block" :style="{ backgroundColor: organizationColorPrimary }" :href="certificateUrl">
                    Download Certificate PDF
                  </Button>
                </Section>

                <Section class="mt-8 pt-6 border-t border-gray-100 mx-auto text-center">
                  <Text class="m-0 font-bold text-gray-800 leading-none mb-1">
                    {{ signerName }}
                  </Text>
                  <Text class="m-0 text-xs text-gray-400 uppercase tracking-wider"> {{ signerTitle }}, {{ organizationName }} </Text>
                </Section>
              </Section>
            </Section>
          </Container>
        </Section>
      </Body>
    </Tailwind>
  </Html>
</template>
