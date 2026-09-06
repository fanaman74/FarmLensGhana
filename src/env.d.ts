/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly EARTHDATA_USERNAME?: string;
  readonly EARTHDATA_PASSWORD?: string;
  readonly OLMOEARTH_API_KEY?: string;
  readonly OLMOEARTH_MODEL_ID?: string;
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENROUTER_MODEL_ID?: string;
  readonly ADMIN_PASSWORD_HASH?: string;
  readonly APP_ENCRYPTION_KEY?: string;
  readonly DATABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
