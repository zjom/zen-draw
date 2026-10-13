import { message } from "@tauri-apps/plugin-dialog";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppConfig, DEFAULT_CONFIG, loadConfig } from "./config";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

// Serve fonts from the bundle (copied by vite.config.ts) instead of Excalidraw's CDN.
window.EXCALIDRAW_ASSET_PATH = "/";

async function main() {
  let config: AppConfig = DEFAULT_CONFIG;
  try {
    config = (await loadConfig()).config;
  } catch (e) {
    void message(`${e}\n\nUsing default settings.`, { title: "Invalid config", kind: "error" });
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}

void main();
