import { Excalidraw } from "@excalidraw/excalidraw";

import { useEffect, useMemo, useState } from "react";

import type { HostCommands } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  UIOptions,
} from "@excalidraw/excalidraw/types";

import { DocumentController } from "./document";
import { toKeymap, toToolRing } from "./shortcuts";

import type { AppConfig } from "./config";

// File handling goes through Tauri (see document.ts), not Excalidraw's browser download/upload.
const uiOptions: UIOptions = {
  canvasActions: { export: false },
};

export function App({ config }: { config: AppConfig }) {
  const doc = useMemo(() => new DocumentController(), []);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
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
        theme="dark"
      ></Excalidraw>
    </div>
  );
}
