/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_MOCKS?: string;
  readonly VITE_MAP_STYLE_LIGHT?: string;
  readonly VITE_MAP_STYLE_DARK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
