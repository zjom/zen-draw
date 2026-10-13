import { invoke } from '@tauri-apps/api/core'

export interface AppConfig {
  license_key: string | null
  keys: {
    tools: Record<string, string>
    actions: Record<string, string>
  }
}

export const DEFAULT_CONFIG: AppConfig = { license_key: null, keys: { tools: {}, actions: {} } }

export async function loadConfig(): Promise<{ path: string | null; config: AppConfig }> {
  return invoke('load_config')
}

/** Expands `mod+x` into tldraw's `cmd+x,ctrl+x` so one binding works on every OS. */
export function expandKbd(kbd: string): string | undefined {
  const parts = kbd
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) =>
      /^mod\+/i.test(s) ? [s.replace(/^mod\+/i, 'cmd+'), s.replace(/^mod\+/i, 'ctrl+')] : [s]
    )
  return parts.length ? parts.join(',') : undefined
}
