/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APPSYNC_HTTP_HOST?: string;
  readonly VITE_APPSYNC_REALTIME_HOST?: string;
  readonly VITE_APPSYNC_API_KEY?: string;
  readonly VITE_WS_URL?: string;
}
