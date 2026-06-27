/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IOS_TAP_TO_PAY_ENABLED?: string;
  readonly VITE_TAP_TO_PAY_VISUAL_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_BUILD_ID__: string;
declare const __GIT_SHA__: string;
