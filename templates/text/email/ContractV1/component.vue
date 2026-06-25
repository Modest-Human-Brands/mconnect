<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Hr } from '@vue-email/components'

defineProps<{
  contractorName: string
  projectName: string
  shootDates: string
  compensationAmount: number
  contractLink: string

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
          <Section class="bg-white p-10 shadow-xl border-t-4 rounded-b-md" :style="{ borderColor: organizationColorPrimary }">
            <Section class="mb-8 text-center">
              <Img :src="organizationLogo" :alt="organizationName" width="120" class="mx-auto mb-6" />
              <Text class="m-0 text-xl font-bold tracking-widest text-gray-400 uppercase mb-2"> Action Required </Text>
              <Text class="m-0 text-2xl font-black text-gray-900 leading-tight"> Independent Contractor Agreement </Text>
            </Section>

            <Hr class="border-gray-100 my-6" />

            <Section class="mb-6">
              <Text class="m-0 text-base text-gray-800 font-medium mb-3"> Hi {{ contractorName }}, </Text>
              <Text class="m-0 text-sm text-gray-600 leading-relaxed mb-4">
                We are excited to have you on board for our upcoming project. Before we begin, please review and sign your Independent Contractor Agreement (Photography & Videography).
              </Text>
            </Section>

            <Section class="bg-gray-50 rounded border border-gray-100 p-5 mb-8">
              <Text class="m-0 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2"> Shoot Summary </Text>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tbody>
                  <tr>
                    <td align="left" valign="top" class="pb-3" width="35%">
                      <Text class="m-0 text-sm font-semibold text-gray-700">Project:</Text>
                    </td>
                    <td align="left" valign="top" class="pb-3">
                      <Text class="m-0 text-sm text-gray-900">{{ projectName }}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" valign="top" class="pb-3">
                      <Text class="m-0 text-sm font-semibold text-gray-700">Shoot Dates:</Text>
                    </td>
                    <td align="left" valign="top" class="pb-3">
                      <Text class="m-0 text-sm text-gray-900"
                        >{{
                          new Date(shootDates).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        }}
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" valign="top">
                      <Text class="m-0 text-sm font-semibold text-gray-700">Compensation:</Text>
                    </td>
                    <td align="left" valign="top">
                      <Text class="m-0 text-sm font-bold text-gray-900" :style="{ color: organizationColorPrimary }">
                        {{ compensationAmount }}
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section class="text-center mb-8">
              <Button
                class="px-8 py-3 rounded text-white font-bold text-sm tracking-wide text-center inline-block no-underline"
                :style="{ backgroundColor: organizationColorAccent }"
                :href="contractLink">
                Review and Sign Contract
              </Button>
              <Text class="m-0 text-xs text-gray-400 mt-4 leading-relaxed px-4">
                By clicking the button above, you will be redirected to our secure portal to review the full legal terms regarding deliverables, compensation, and copyright ownership.
              </Text>
            </Section>

            <Hr class="border-gray-100 my-8" />

            <Section class="text-center">
              <Text class="m-0 text-xs text-gray-500 leading-relaxed mb-2"> If you have any questions regarding the terms of this contract, please reply directly to this email. </Text>
              <Text class="m-0 text-xs text-gray-400 mt-4">
                &copy; {{ new Date().getFullYear() }} <a :href="organizationWebsite" class="underline text-gray-400 hover:text-gray-600">{{ organizationName }}</a
                >. All rights reserved.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
