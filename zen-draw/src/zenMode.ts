import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import "./zenMode.css";

/**
 * Works around Excalidraw's mobile layout ignoring zen mode: unlike the desktop UI, it never adds a
 * `zen-mode` class, so its top and bottom bars stay visible. Mirroring `zenModeEnabled` onto the
 * container as `data-zen` lets zenMode.css hide them. Returns the cleanup function.
 */
export function syncZenMode(
  api: ExcalidrawImperativeAPI,
  container: HTMLElement,
): () => void {
  const sync = () =>
    container.toggleAttribute("data-zen", api.getAppState().zenModeEnabled);
  sync();
  return api.onChange(sync);
}
