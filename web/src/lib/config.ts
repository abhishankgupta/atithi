export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
  appEnv: import.meta.env.VITE_APP_ENV ?? 'local',
}

export const isProduction = config.appEnv === 'production'
