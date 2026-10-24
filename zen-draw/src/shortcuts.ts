import type { KeymapOverrides } from "@excalidraw/excalidraw";

import type { AppConfig } from "./config";

/**
 * Converts the `[keys]` table of the config into the `keymap` prop. An empty
 * string removes all key combinations of the command. zenboard warns about
 * unknown command IDs in the devtools console.
 */
export function toKeymap(config: AppConfig): KeymapOverrides {
  const keymap: Record<string, string | null> = {};
  for (const [id, keys] of Object.entries(config.keys)) {
    keymap[id] = keys.trim() === "" ? null : keys;
  }
  return keymap as KeymapOverrides;
}
