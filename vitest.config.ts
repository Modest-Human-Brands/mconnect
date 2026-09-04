import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from 'unplugin-vue/rollup'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
