<script setup lang="ts">
defineProps<{
  otp?: string
}>()

useSeoMeta({
  title: 'Your OTP Code',
})
</script>

<template>
  <Layout body-class="dark:bg-gray-950">
    <div class="font-inter">
      <table align="center" class="m-0 mx-auto">
        <tr>
          <td class="w-138 max-w-full">
            <Spacer size="24px" />
            <table class="w-full">
              <tr>
                <td class="py-6 px-9 sm:p-6 bg-white dark:bg-gray-800 dark:border-gray-500 border border-slate-200 rounded-lg">
                  <img src="/public/logo.png" width="70" alt="Motia" />

                  <Spacer size="24px" />

                  <h1 class="m-0 mb-6 text-2xl/8 text-slate-900 dark:text-gray-300 font-semibold">Verification Code</h1>

                  <p class="m-0 mb-6 text-base/6 text-slate-600 dark:text-gray-300">Use the code below to verify your account. This code will expire in 10 minutes:</p>

                  <div class="py-4 px-6 bg-slate-100 dark:bg-gray-700 rounded-md text-center">
                    <span class="text-3xl font-mono tracking-widest font-bold text-indigo-600 dark:text-indigo-400">
                      {{ otp }}
                    </span>
                  </div>

                  <Spacer size="24px" />

                  <p class="m-0 text-xs/5 text-slate-600 dark:text-gray-400">If you didn't request this code, you can safely ignore this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </Layout>
</template>
