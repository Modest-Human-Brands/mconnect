import { defineConfig } from 'nitro'
import vue from 'unplugin-vue/rollup'

export default defineConfig({
  serverDir: './server',
  rollupConfig: {
    plugins: [vue()],
  },
  // imports: {},
  features: {
    websocket: true,
  },
  experimental: {
    tasks: true,
  },
  scheduledTasks: {
    '*/1 * * * *': ['sync:resource'],
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
    data: {
      driver: 'fs',
      base: './.data',
    },
  },
})
