import { isDarwin, isLatinChar } from "@excalidraw/common";

import { t } from "../i18n";

import type { KeyCombination } from "./types";

export type ParsedKeyCombination = {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  /** a lowercase letter, a digit, a symbol, or the `event.key` of a named
   * key (e.g. `Escape`, `ArrowUp`, ` `) */
  key: string;
  kind: "letter" | "digit" | "named" | "symbol";
};

/** the match came from `event.key` */
export const KEY_MATCH = 2;
/** the match came from `event.code` (a fallback for non-Latin layouts and
 * for symbols that a modifier changes, e.g. `alt+[` on macOS) */
export const CODE_MATCH = 1;
export type MatchResult = 0 | typeof CODE_MATCH | typeof KEY_MATCH;

/** key names of the syntax → `event.key` */
const NAMED_KEYS: Record<string, string> = {
  escape: "Escape",
  esc: "Escape",
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  space: " ",
  delete: "Delete",
  del: "Delete",
  backspace: "Backspace",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  pageup: "PageUp",
  pagedown: "PageDown",
  home: "Home",
  end: "End",
  insert: "Insert",
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`f${i + 1}`, `F${i + 1}`]),
  ),
};

/** symbols that the syntax cannot write directly, because `+` and `,` are
 * separators */
const SYMBOL_NAMES: Record<string, string> = {
  plus: "+",
  minus: "-",
  comma: ",",
};

/** `event.code` → the symbol on a US layout, for the `event.code` fallback */
const CODE_SYMBOLS: Record<string, string> = {
  Equal: "=",
  Minus: "-",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
  NumpadAdd: "+",
  NumpadSubtract: "-",
};

/** splits a string (or a list of strings) into single key combinations */
export const splitKeyCombinations = (
  input: KeyCombination | readonly KeyCombination[],
): KeyCombination[] =>
  (typeof input === "string" ? [input] : input)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

/**
 * Parses one key combination, e.g. `mod+shift+s`. On macOS, `mod` is Cmd;
 * elsewhere, it is Ctrl. Returns `null` for an invalid key combination.
 */
export const parseKeyCombination = (
  input: KeyCombination,
  isMac: boolean = isDarwin,
): ParsedKeyCombination | null => {
  const parts = input.trim().toLowerCase().split("+");
  let keyPart = parts.pop()!;
  // `+` as the key ("shift++") leaves two empty parts
  if (keyPart === "" && parts.length > 0 && parts[parts.length - 1] === "") {
    parts.pop();
    keyPart = "+";
  }
  if (!keyPart) {
    return null;
  }

  const parsed: ParsedKeyCombination = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: "",
    kind: "symbol",
  };

  for (const part of parts) {
    switch (part) {
      case "mod":
        parsed[isMac ? "meta" : "ctrl"] = true;
        break;
      case "ctrl":
      case "control":
        parsed.ctrl = true;
        break;
      case "cmd":
      case "command":
      case "meta":
        parsed.meta = true;
        break;
      case "alt":
      case "option":
        parsed.alt = true;
        break;
      case "shift":
        parsed.shift = true;
        break;
      default:
        return null;
    }
  }

  if (/^[a-z]$/.test(keyPart)) {
    parsed.key = keyPart;
    parsed.kind = "letter";
  } else if (/^[0-9]$/.test(keyPart)) {
    parsed.key = keyPart;
    parsed.kind = "digit";
  } else if (keyPart in NAMED_KEYS) {
    parsed.key = NAMED_KEYS[keyPart];
    parsed.kind = "named";
  } else if (keyPart in SYMBOL_NAMES) {
    parsed.key = SYMBOL_NAMES[keyPart];
  } else if (keyPart.length === 1) {
    parsed.key = keyPart;
  } else {
    return null;
  }

  return parsed;
};

const keyToSyntax = (parsed: ParsedKeyCombination) => {
  if (parsed.kind === "named") {
    return parsed.key === " " ? "space" : parsed.key.toLowerCase();
  }
  return parsed.key === "+"
    ? "plus"
    : parsed.key === ","
    ? "comma"
    : parsed.key;
};

/** a platform-specific form in which equal key combinations are equal
 * strings, e.g. `ctrl+shift+s` for `shift+mod+s` on Linux */
export const toCanonicalKeyCombination = (parsed: ParsedKeyCombination) =>
  [
    parsed.ctrl && "ctrl",
    parsed.meta && "meta",
    parsed.alt && "alt",
    parsed.shift && "shift",
    keyToSyntax(parsed),
  ]
    .filter(Boolean)
    .join("+");

const NAMED_KEY_LABELS: Record<string, () => string> = {
  Escape: () => t("keys.escape"),
  Enter: () => t("keys.enter"),
  " ": () => t("keys.spacebar"),
  Delete: () => t("keys.delete"),
  ArrowUp: () => "↑",
  ArrowDown: () => "↓",
  ArrowLeft: () => "←",
  ArrowRight: () => "→",
};

/** formats a key combination as a label, e.g. `Ctrl+Shift+S` */
export const formatKeyCombination = (
  input: KeyCombination | ParsedKeyCombination,
  isMac: boolean = isDarwin,
): string => {
  const parsed =
    typeof input === "string" ? parseKeyCombination(input, isMac) : input;
  if (!parsed) {
    return "";
  }
  const key =
    parsed.kind === "letter"
      ? parsed.key.toUpperCase()
      : parsed.kind === "named"
      ? NAMED_KEY_LABELS[parsed.key]?.() ?? parsed.key
      : parsed.key;
  return [
    parsed.ctrl && t("keys.ctrl"),
    parsed.meta && (isMac ? t("keys.cmd") : "Meta"),
    parsed.alt && (isMac ? t("keys.option") : t("keys.alt")),
    parsed.shift && t("keys.shift"),
    key,
  ]
    .filter(Boolean)
    .join("+");
};

/**
 * Matches a key combination to a keyboard event. The modifiers of the event
 * must equal the modifiers of the key combination, with one exception: when
 * `event.key` equals a symbol, Shift may be held without being in the key
 * combination, because Shift is how many layouts type the symbol (e.g. `?`).
 *
 * - a letter: `event.key` in lowercase (CapsLock-insensitive), or
 *   `event.code` if `event.key` is not a Latin character (e.g. `mod+z` on a
 *   Russian layout)
 * - a digit: `event.code` (`shift+1` produces `!` in `event.key`), or
 *   `event.key`
 * - a symbol: `event.key`, or `event.code` on a US layout
 * - a named key: `event.key`
 */
export const matchKeyCombination = (
  parsed: ParsedKeyCombination,
  event: KeyboardEvent | React.KeyboardEvent,
): MatchResult => {
  if (
    parsed.ctrl !== event.ctrlKey ||
    parsed.meta !== event.metaKey ||
    parsed.alt !== event.altKey
  ) {
    return 0;
  }
  const shiftMatches = parsed.shift === event.shiftKey;

  switch (parsed.kind) {
    case "letter":
      if (!shiftMatches) {
        return 0;
      }
      if (event.key.toLowerCase() === parsed.key) {
        return KEY_MATCH;
      }
      return !isLatinChar(event.key) &&
        event.code === `Key${parsed.key.toUpperCase()}`
        ? CODE_MATCH
        : 0;
    case "digit":
      return shiftMatches &&
        (event.code === `Digit${parsed.key}` ||
          event.code === `Numpad${parsed.key}` ||
          event.key === parsed.key)
        ? KEY_MATCH
        : 0;
    case "named":
      return shiftMatches &&
        (event.key === parsed.key ||
          (parsed.key === " " && event.code === "Space"))
        ? KEY_MATCH
        : 0;
    case "symbol":
      if (event.key === parsed.key && (shiftMatches || !parsed.shift)) {
        return KEY_MATCH;
      }
      return shiftMatches && CODE_SYMBOLS[event.code] === parsed.key
        ? CODE_MATCH
        : 0;
  }
};
