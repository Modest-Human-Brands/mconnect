import { defineConfig } from 'nitro'
import vue from 'unplugin-vue/rollup'
import mcp from 'nitro-mcp-toolkit/module'

export default defineConfig({
  modules: [mcp()],
  serverDir: './server',
  routeRules: {
    '/api/**': { cors: true },
  },
  rollupConfig: {
    plugins: [vue()],
  },
  features: {
    websocket: true,
  },
  experimental: {
    tasks: true,
  },
  scheduledTasks: {
    '*/5 * * * *': ['sync:telemetry', 'sync:resource'],
  },
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
    public: {
      connectUrl: '',
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
