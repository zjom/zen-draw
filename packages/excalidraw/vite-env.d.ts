/// <reference types="vite/client" />
interface ImportMetaEnv {
  VITE_APP_LIBRARY_URL: string;

  // To enable bounding box for text containers
  VITE_APP_DEBUG_ENABLE_TEXT_CONTAINER_BOUNDING_BOX: string;

  VITE_APP_ENABLE_TRACKING: string;

  PKG_NAME: string;
  PKG_VERSION: string;

  VITE_WORKER_ID: string;
  MODE: string;
  DEV: string;
  PROD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
