import { defineConfig } from 'nitro'
import vue from 'unplugin-vue/rollup'

export default defineConfig({
  serverDir: './server',
  rollupConfig: {
    plugins: [
      vue({
        isProduction: true,
        compilerOptions: { ssr: true },
      }),
    ],
  },
  // imports: {},
  features: {
    websocket: true,
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
  storage: {
    fs: {
      driver: 'fs',
      base: './static',
    },
  },
})
