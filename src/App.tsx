import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./App.css";
import type { ExcalidrawImperativeAPI, UIOptions } from "@excalidraw/excalidraw/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppConfig } from "./config";
import { DocumentController } from "./document";
import { installShortcuts } from "./shortcuts";
import { syncToolHighlight } from "./toolHighlight";

// File handling goes through Tauri (see document.ts), not Excalidraw's browser download/upload.
const uiOptions: UIOptions = {
  canvasActions: { loadScene: false, saveToActiveFile: false, export: false },
};

export function App({ config }: { config: AppConfig }) {
  const doc = useMemo(() => new DocumentController(), []);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api) return;
    const cleanups = [
      doc.attach(api),
      installShortcuts(config, api, {
        "app.open": () => void doc.open(),
        "app.save": () => void doc.save(),
        "app.save-as": () => void doc.saveAs(),
      }),
      syncToolHighlight(api),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [api, config, doc]);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0 }}>
      <Excalidraw excalidrawAPI={setApi} UIOptions={uiOptions} theme="dark"></Excalidraw>
    </div>
  );
}
