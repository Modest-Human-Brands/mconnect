import { defineConfig } from 'nitro'
import vue from 'unplugin-vue/rollup'

export default defineConfig({
  serverDir: './server',
  rollupConfig: {
    plugins: [vue()],
  },
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
    private: {
      notionDbId: '',
    },
  },
})
