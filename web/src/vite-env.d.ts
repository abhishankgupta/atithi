/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Spring Boot API, e.g. https://atithi-api-test.onrender.com. Empty = same origin (local proxy). */
  readonly VITE_API_BASE_URL?: string
  /** "local", "test" or "production". Shown as a banner outside production. */
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
