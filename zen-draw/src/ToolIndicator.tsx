import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toolIcons } from "./icons";
import "./toolIndicator.css";

const activeToolIcon = ({ zenModeEnabled, activeTool }: AppState) =>
  zenModeEnabled && activeTool.type !== "custom" ? toolIcons[activeTool.type] : null;

/**
 * Shows the active tool's icon in the corner while zen mode hides the toolbar. Portaled into
 * `.excalidraw` so its theme variables (e.g. --color-disabled) apply.
 */
export function ToolIndicator({ api, container }: { api: ExcalidrawImperativeAPI; container: HTMLElement }) {
  const [icon, setIcon] = useState(() => activeToolIcon(api.getAppState()));
  // onChange fires on every scene change, but setState bails out while the icon is unchanged.
  useEffect(() => api.onChange((_, appState) => setIcon(activeToolIcon(appState))), [api]);

  const root = container.querySelector(".excalidraw");
  if (!icon || !root) return null;
  return createPortal(<div className="tool-indicator">{icon}</div>, root);
}
