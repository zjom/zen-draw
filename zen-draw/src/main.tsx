import { message } from "@tauri-apps/plugin-dialog";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

import { DEFAULT_CONFIG, loadConfig } from "./config";

import type { AppConfig } from "./config";

// Load the fonts that Vite bundles from the library source, not from the CDN fallback.
window.EXCALIDRAW_ASSET_PATH = "/";

async function main() {
  let config: AppConfig = DEFAULT_CONFIG;
  try {
    config = (await loadConfig()).config;
  } catch (e) {
    void message(`${e}\n\nUsing default settings.`, {
      title: "Invalid config",
      kind: "error",
    });
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}

void main();
