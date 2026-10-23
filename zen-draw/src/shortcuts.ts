import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { AppConfig } from "./config";

type ToolType = Parameters<ExcalidrawImperativeAPI["setActiveTool"]>[0]["type"];

/** Excalidraw's built-in tool shortcuts, blocked when a tool is rebound in the config. */
const DEFAULT_TOOL_KEYS: Partial<Record<ToolType, string[]>> = {
  selection: ["v", "1"],
  rectangle: ["r", "2"],
  diamond: ["d", "3"],
  ellipse: ["o", "4"],
  arrow: ["a", "5"],
  line: ["l", "6"],
  freedraw: ["p", "x", "7"],
  text: ["t", "8"],
  image: ["9"],
  eraser: ["e", "0"],
  hand: ["h"],
  frame: ["f"],
  laser: ["k"],
};

export const APP_ACTIONS = ["app.open", "app.save", "app.save-as"] as const;
export type AppAction = (typeof APP_ACTIONS)[number];

const DEFAULT_ACTION_KEYS: Record<AppAction, string> = {
  "app.open": "mod+o",
  "app.save": "mod+s",
  "app.save-as": "mod+shift+s",
};

/** Excalidraw's own load/save shortcuts, which only offer browser downloads. Always blocked. */
const BUILTIN_FILE_KEYS = "mod+o,mod+s,mod+shift+s";

interface Combo {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

const isMac = /Mac/.test(navigator.platform);

/** Parses `"shift+p"`, `"mod+s"`, `"cmd+z,ctrl+z"` (comma = alternatives). */
function parse(kbd: string): Combo[] {
  return kbd
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => {
      const parts = s.split("+");
      // `+` itself as the key: "shift++" splits into [..., '', ''].
      const key = parts.at(-1) || "+";
      const mods = new Set(parts.slice(0, -1));
      const mod = mods.has("mod");
      return {
        key,
        ctrl: mods.has("ctrl") || (mod && !isMac),
        meta: mods.has("cmd") || mods.has("meta") || (mod && isMac),
        alt: mods.has("alt") || mods.has("option"),
        shift: mods.has("shift"),
      };
    });
}

function keyOf(e: KeyboardEvent): string[] {
  // Prefer the physical key for letters/digits so `shift+1` and `alt+p` work on every layout.
  const fromCode = /^Key([A-Z])$|^Digit(\d)$/.exec(e.code);
  const code = fromCode ? (fromCode[1] ?? fromCode[2]).toLowerCase() : null;
  return [e.key.toLowerCase(), ...(code ? [code] : [])];
}

function matches(combos: Combo[], e: KeyboardEvent): boolean {
  const keys = keyOf(e);
  return combos.some(
    (c) =>
      keys.includes(c.key) &&
      c.ctrl === e.ctrlKey &&
      c.meta === e.metaKey &&
      c.alt === e.altKey &&
      c.shift === e.shiftKey,
  );
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA");
}

/**
 * Applies the configured shortcuts ahead of Excalidraw, which has no API for rebinding.
 * Returns the cleanup function.
 */
export function installShortcuts(
  config: AppConfig,
  api: ExcalidrawImperativeAPI,
  actions: Record<AppAction, () => void>,
): () => void {
  const handlers: { combos: Combo[]; run: () => void }[] = [];
  const blocked: Combo[] = [...parse(BUILTIN_FILE_KEYS)];

  for (const id of APP_ACTIONS) {
    const kbd = config.keys.actions[id] ?? DEFAULT_ACTION_KEYS[id];
    handlers.push({ combos: parse(kbd), run: actions[id] });
  }
  for (const id of Object.keys(config.keys.actions)) {
    if (!(APP_ACTIONS as readonly string[]).includes(id))
      console.warn(`config: unknown action id "${id}"`);
  }

  for (const [id, kbd] of Object.entries(config.keys.tools)) {
    const defaults = DEFAULT_TOOL_KEYS[id as ToolType];
    if (!defaults) {
      console.warn(`config: unknown tool id "${id}"`);
      continue;
    }
    blocked.push(...parse(defaults.join(",")));
    const type = id as ToolType;
    handlers.push({ combos: parse(kbd), run: () => api.setActiveTool({ type } as never) });
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    const handler = handlers.find((h) => matches(h.combos, e));
    if (!handler && !matches(blocked, e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    handler?.run();
  };
  // Capture phase on window runs before Excalidraw's own listeners.
  window.addEventListener("keydown", onKeyDown, { capture: true });
  return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
}

/** Human-readable label for an app action's first shortcut, e.g. `Ctrl+Shift+S`. */
export function shortcutLabel(config: AppConfig, id: AppAction): string | undefined {
  const combo = parse(config.keys.actions[id] ?? DEFAULT_ACTION_KEYS[id])[0];
  if (!combo) return undefined;
  const mods = [
    combo.ctrl && "Ctrl",
    combo.meta && (isMac ? "⌘" : "Meta"),
    combo.alt && (isMac ? "⌥" : "Alt"),
    combo.shift && "Shift",
  ].filter(Boolean);
  return [...mods, combo.key.toUpperCase()].join("+");
}
