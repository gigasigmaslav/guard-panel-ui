/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string | undefined;
  readonly VITE_DEV_API_PROXY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
