import { invoke } from "@tauri-apps/api/core";

export interface AppConfig {
  keys: {
    tools: Record<string, string>;
    actions: Record<string, string>;
  };
}

export const DEFAULT_CONFIG: AppConfig = { keys: { tools: {}, actions: {} } };

export async function loadConfig(): Promise<{
  path: string | null;
  config: AppConfig;
}> {
  return invoke("load_config");
}
