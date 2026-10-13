import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, UIOptions } from "@excalidraw/excalidraw/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppConfig } from "./config";
import { nativeCursors } from "./cursors";
import { DocumentController } from "./document";
import { installShortcuts, shortcutLabel } from "./shortcuts";

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
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [api, config, doc]);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0 }}>
      <Excalidraw excalidrawAPI={setApi} UIOptions={uiOptions}>
        <MainMenu>
          <MainMenu.Item
            onSelect={() => void doc.open()}
            shortcut={shortcutLabel(config, "app.open")}
          >
            Open…
          </MainMenu.Item>
          <MainMenu.Item
            onSelect={() => void doc.save()}
            shortcut={shortcutLabel(config, "app.save")}
          >
            Save
          </MainMenu.Item>
          <MainMenu.Item
            onSelect={() => void doc.saveAs()}
            shortcut={shortcutLabel(config, "app.save-as")}
          >
            Save as…
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
