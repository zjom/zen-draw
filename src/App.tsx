import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./App.css";
import type { ExcalidrawImperativeAPI, UIOptions } from "@excalidraw/excalidraw/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppConfig } from "./config";
import { DocumentController } from "./document";
import { installShortcuts } from "./shortcuts";
import { syncToolHighlight } from "./toolHighlight";
import { syncZenMode } from "./zenMode";

// File handling goes through Tauri (see document.ts), not Excalidraw's browser download/upload.
const uiOptions: UIOptions = {
  canvasActions: { loadScene: false, saveToActiveFile: false, export: false },
};

// Start in zen mode via initialData rather than the `zenModeEnabled` prop, which would lock it on.
const initialData = { appState: { zenModeEnabled: true } };

export function App({ config }: { config: AppConfig }) {
  const doc = useMemo(() => new DocumentController(), []);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api || !containerRef.current) return;
    const cleanups = [
      doc.attach(api),
      installShortcuts(config, api, {
        "app.open": () => void doc.open(),
        "app.save": () => void doc.save(),
        "app.save-as": () => void doc.saveAs(),
      }),
      syncToolHighlight(api),
      syncZenMode(api, containerRef.current),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [api, config, doc]);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0 }}>
      <Excalidraw
        excalidrawAPI={setApi}
        UIOptions={uiOptions}
        initialData={initialData}
        theme="dark"
      ></Excalidraw>
    </div>
  );
}
