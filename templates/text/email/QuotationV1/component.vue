<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Hr } from '@vue-email/components'

interface QuotationItem {
  description: string
  quantity: number
  amount: string | number
}

defineProps<{
  clientName: string
  quoteNumber: string
  validUntil: string
  items: QuotationItem[]
  totalAmount: string | number
  quotationUrl: string
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
    <Tailwind :config="{ theme: { extend: { colors: { primary: organizationColorPrimary } } } }">
      <Body :style="{ fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif` }" class="m-0 p-0 bg-gray-50">
        <Container class="mx-auto w-full max-w-[600px] my-10">
          <Section class="bg-white p-10 shadow-xl border-t-4" :style="{ borderColor: organizationColorPrimary }">
            <Section class="mb-8">
              <Img :src="organizationLogo" :alt="organizationName" width="120" class="mb-4" />
              <Text class="m-0 text-xs uppercase tracking-wider text-gray-400 font-semibold"> Commercial Estimate / Proposal </Text>
              <Text class="m-0 text-xl font-bold text-gray-800"> Quote #{{ quoteNumber }} </Text>
            </Section>

            <Hr class="border-gray-100 my-4" />

            <Section class="mb-6">
              <Text class="m-0 text-base text-gray-700 mb-2">
                Hello <strong>{{ clientName }}</strong
                >,
              </Text>
              <Text class="m-0 text-sm text-gray-600 leading-relaxed">
                Thank you for the opportunity to estimate your upcoming project goals. Below is a breakdown of our standard deliverables and commercial requirements curated for your brand.
              </Text>
              <Text v-if="validUntil" class="m-0 mt-3 text-xs text-red-500 font-medium"> ⚠️ This proposal pricing is valid until: {{ validUntil }} </Text>
            </Section>

            <Section v-if="items && items.length > 0" class="bg-gray-50 rounded-lg p-4 my-6">
              <Text class="m-0 mb-3 text-xs uppercase tracking-wider font-bold text-gray-400"> Estimate Summary </Text>

              <div v-for="(item, index) in items" :key="index" class="py-2 border-b border-gray-200/60 last:border-0">
                <table width="100%">
                  <!-- Fix: Added tbody wrapper to satisfy Vue HTML5 specifications -->
                  <tbody>
                    <tr>
                      <td align="left">
                        <Text class="m-0 text-sm font-semibold text-gray-800">{{ item.description }}</Text>
                        <Text class="m-0 text-xs text-gray-400">Qty: {{ item.quantity }}</Text>
                      </td>
                      <td align="right" valign="middle">
                        <Text class="m-0 text-sm font-bold text-gray-700">{{ item.amount }}</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section class="text-right my-6 pr-2">
              <Text class="m-0 text-xs uppercase tracking-wider text-gray-400 font-semibold"> Estimated Gross Total </Text>
              <Text class="m-0 text-2xl font-black text-gray-900">
                {{ totalAmount }}
              </Text>
            </Section>

            <Section class="text-center my-8">
              <Button
                class="px-6 py-3 rounded text-white font-bold text-sm tracking-wide text-center inline-block no-underline"
                :style="{ backgroundColor: organizationColorAccent }"
                :href="quotationUrl">
                Review Full Proposal & Accept Terms
              </Button>
            </Section>

            <Hr class="border-gray-100 my-6" />

            <Section class="text-center">
              <Text class="m-0 text-xs text-gray-400 leading-normal">
                If you have any questions regarding this breakdown statement, reach out to our accounts team at
                <a :href="organizationWebsite" class="underline" :style="{ color: organizationColorPrimary }"> {{ organizationName }} </a>.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
