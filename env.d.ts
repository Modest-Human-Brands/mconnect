interface ImportMetaEnv {
  readonly NODE_ENV: 'development' | 'production'
  readonly HOSTNAME: string

  readonly MOTIA_APP_VERSION: string
  readonly MOTIA_APP_BUILD_TIME: string

  readonly HOSTINGER_EMAIL_BASE_URL: string
  readonly HOSTINGER_EMAIL_COOKIE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
