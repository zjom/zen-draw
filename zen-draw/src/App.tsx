import { Excalidraw } from "@excalidraw/excalidraw";

import { useEffect, useMemo, useRef, useState } from "react";

import type { HostCommands } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  UIOptions,
} from "@excalidraw/excalidraw/types";

import "./App.css";

import { DocumentController } from "./document";
import { toKeymap } from "./shortcuts";
import { syncToolHighlight } from "./toolHighlight";
import { ToolIndicator } from "./ToolIndicator";
import { syncZenMode } from "./zenMode";

import type { AppConfig } from "./config";

// File handling goes through Tauri (see document.ts), not Excalidraw's browser download/upload.
const uiOptions: UIOptions = {
  canvasActions: { export: false },
};

// Start in zen mode via initialData rather than the `zenModeEnabled` prop, which would lock it on.
const initialData = { appState: { zenModeEnabled: true } };

export function App({ config }: { config: AppConfig }) {
  const doc = useMemo(() => new DocumentController(), []);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const keymap = useMemo(() => toKeymap(config), [config]);
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
    if (!api || !containerRef.current) {
      return;
    }
    const cleanups = [
      doc.attach(api),
      syncToolHighlight(api),
      syncZenMode(api, containerRef.current),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [api, doc]);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0 }}>
      <Excalidraw
        onExcalidrawAPI={setApi}
        UIOptions={uiOptions}
        initialData={initialData}
        keymap={keymap}
        commands={commands}
        // the keymap also works when the focus is outside the canvas
        handleKeyboardGlobally
        theme="dark"
      ></Excalidraw>
      {api && containerRef.current && (
        <ToolIndicator api={api} container={containerRef.current} />
      )}
    </div>
  );
}
