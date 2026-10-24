import { invoke } from "@tauri-apps/api/core";

export interface AppConfig {
  /** command ID → key combinations, e.g. `"tool.freedraw" = "d"` */
  keys: Record<string, string>;
  /** the commands of the tool ring; a missing list keeps the default */
  ring: { items?: string[]; more?: string[] };
}

export const DEFAULT_CONFIG: AppConfig = { keys: {}, ring: {} };

export async function loadConfig(): Promise<{
  path: string | null;
  config: AppConfig;
}> {
  return invoke("load_config");
}
