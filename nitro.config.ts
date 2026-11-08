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
    '5,20,35,50 * * * *': ['sync:telemetry', 'sync:resource'],
    '* * * * *': ['sync:email'],
  },
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
    public: {
      connectUrl: process.env.NITRO_MCONNECT_PUBLIC_CONNECT_URL || '',
    },
    private: {
      notionDbId: process.env.NOTION_DB_ID || '',
      apiKey: process.env.NITRO_MCONNECT_PRIVATE_API_KEY || '',
      webhookSecret: process.env.NITRO_MCONNECT_PRIVATE_WEBHOOK_SECRET || '',
      voiceOrgSlug: process.env.NITRO_MCONNECT_PRIVATE_VOICE_ORG_SLUG || '',
      googleClientId: process.env.NITRO_MCONNECT_PRIVATE_GOOGLE_CLIENT_ID || '',
      googleClientSecret: process.env.NITRO_MCONNECT_PRIVATE_GOOGLE_CLIENT_SECRET || '',
      microsoftClientId: process.env.NITRO_MCONNECT_PRIVATE_MICROSOFT_CLIENT_ID || '',
      microsoftClientSecret: process.env.NITRO_MCONNECT_PRIVATE_MICROSOFT_CLIENT_SECRET || '',
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
