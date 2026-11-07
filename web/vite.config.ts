/// <reference types="vitest/config" />
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { headersFile } from './security-headers.ts'

/** Writes dist/_headers (CSP and friends) for Cloudflare Workers static assets. */
function securityHeaders(apiBaseUrl: string | undefined): Plugin {
  let outDir = 'dist'
  return {
    name: 'atithi-security-headers',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      writeFileSync(resolve(outDir, '_headers'), headersFile(apiBaseUrl))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), securityHeaders(env.VITE_API_BASE_URL)],
    server: {
      // Local dev: the Spring Boot API runs on 8080.
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
