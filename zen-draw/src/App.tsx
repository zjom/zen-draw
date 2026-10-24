import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useEffect, useMemo, useState } from "react";

import type { HostCommands } from "@excalidraw/excalidraw";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  UIOptions,
} from "@excalidraw/excalidraw/types";

import { DocumentController } from "./document";
import { toKeymap, toToolRing } from "./shortcuts";

import type { AppConfig, ThemeMode } from "./config";

// File handling goes through Tauri (see document.ts), not Excalidraw's browser download/upload.
const uiOptions: UIOptions = {
  canvasActions: { export: false },
};

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

type Theme = AppState["theme"];

const resolveMode = (mode: ThemeMode = "dark"): Theme =>
  mode === "system" ? (systemDark.matches ? THEME.DARK : THEME.LIGHT) : mode;

export function App({ config }: { config: AppConfig }) {
  const doc = useMemo(() => new DocumentController(), []);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  // toggleTheme changes it until the next start or system theme change
  const [theme, setTheme] = useState(() => resolveMode(config.theme.mode));
  const keymap = useMemo(() => toKeymap(config), [config]);
  const toolRing = useMemo(() => toToolRing(config), [config]);
  const commands = useMemo<HostCommands>(
    () => ({
      "host.open": { label: "Open", keys: "mod+o", run: () => void doc.open() },
      "host.save": { label: "Save", keys: "mod+s", run: () => void doc.save() },
      "host.saveAs": {
        label: "Save as",
        keys: "mod+shift+s",
        run: () => void doc.saveAs(),
      },
    }),
    [doc],
  );

  useEffect(() => {
    if (config.theme.mode !== "system") {
      return;
    }
    const onChange = () => setTheme(resolveMode("system"));
    systemDark.addEventListener("change", onChange);
    return () => systemDark.removeEventListener("change", onChange);
  }, [config.theme.mode]);

  // the native window decorations follow the editor theme
  useEffect(() => {
    void getCurrentWindow().setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!api) {
      return;
    }
    return doc.attach(api);
  }, [api, doc]);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Excalidraw
        onExcalidrawAPI={setApi}
        UIOptions={uiOptions}
        keymap={keymap}
        commands={commands}
        toolRing={toolRing}
        // the keymap also works when the focus is outside the canvas
        handleKeyboardGlobally
        theme={theme}
        onThemeChange={(next) => setTheme(resolveMode(next))}
      ></Excalidraw>
    </div>
  );
}
