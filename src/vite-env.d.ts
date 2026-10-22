/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OWNER_EMAIL?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_OWNER_UID?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}