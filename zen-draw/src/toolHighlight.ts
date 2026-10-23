import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "./toolHighlight.css";

/**
 * Works around WebKitGTK not restyling `.ToolIcon_type_radio:checked + .ToolIcon__icon` when a
 * tool changes without a click (e.g. keyboard shortcuts): the inputs' `checked` is correct, but
 * the toolbar highlight stays on the old tool. Mirroring `checked` onto the icon as an attribute
 * forces WebKit to restyle each icon, and toolHighlight.css paints the highlight from it.
 * Returns the cleanup function.
 */
export function syncToolHighlight(api: ExcalidrawImperativeAPI): () => void {
  // Runs after every commit, so remounted toolbars are picked up too.
  return api.onChange(() => {
    for (const input of document.querySelectorAll<HTMLInputElement>(".ToolIcon_type_radio")) {
      input.nextElementSibling?.toggleAttribute("data-checked", input.checked);
    }
  });
}
