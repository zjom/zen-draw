import { message } from "@tauri-apps/plugin-dialog";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

import { DEFAULT_CONFIG, loadConfig } from "./config";
import { applyThemeCss } from "./theme";
import { showWindow } from "./window";

import type { AppConfig } from "./config";

// Load the fonts that Vite bundles from the library source, not from the CDN fallback.
window.EXCALIDRAW_ASSET_PATH = "/";

// App shows the window once the editor has painted; this is the fallback when
// startup fails, so the window never stays hidden
setTimeout(() => void showWindow(), 3000);

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

  applyThemeCss(config);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}

void main();
