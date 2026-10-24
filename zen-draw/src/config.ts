import { invoke } from "@tauri-apps/api/core";

export interface AppConfig {
  /** command ID → key combinations, e.g. `"tool.freedraw" = "d"` */
  keys: Record<string, string>;
  /** the commands of the tool ring; a missing list keeps the default */
  ring: { items?: string[]; more?: string[] };
  theme: {
    /** a missing mode keeps the default (dark) */
    mode?: ThemeMode;
    light: Palette;
    dark: Palette;
  };
}

export type ThemeMode = "light" | "dark" | "system";

/** The colors of one theme mode, as shown on screen. A missing color keeps the default. */
export interface Palette {
  accent?: string;
  surface?: string;
  text?: string;
  border?: string;
  selection?: string;
  canvas?: string;
  grid?: string;
  "grid-bold"?: string;
  /** any Excalidraw CSS variable, without the leading `--` */
  vars: Record<string, string>;
}

export const DEFAULT_CONFIG: AppConfig = {
  keys: {},
  ring: {},
  theme: { light: { vars: {} }, dark: { vars: {} } },
};

export async function loadConfig(): Promise<{
  path: string | null;
  config: AppConfig;
}> {
  return invoke("load_config");
}
