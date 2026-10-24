import type { AppConfig, Palette } from "./config";

type ColorKey = Exclude<keyof Palette, "vars">;

// Higher specificity than the rules in packages/excalidraw/css/theme.scss,
// whatever the order the stylesheets load in.
const SELECTORS = {
  light: ".excalidraw.excalidraw:not(.theme--dark)",
  dark: ".excalidraw.excalidraw.theme--dark",
} as const;

const mix = (a: string, b: string, percentOfB: number) =>
  `color-mix(in srgb, ${a}, ${b} ${percentOfB}%)`;

/** The CSS variables that each short key sets, in order; later entries may use earlier ones. */
const toVars = (palette: Palette, mode: "light" | "dark") => {
  const vars: Record<string, string> = {};
  const { accent, surface, text, border } = palette;
  // a darker accent on light surfaces and a lighter one on dark surfaces
  const shade = mode === "dark" ? "white" : "black";

  if (accent) {
    vars["color-primary"] = accent;
    vars["color-primary-hover"] = mix(accent, shade, 10);
    vars["color-primary-darker"] = mix(accent, shade, 10);
    vars["color-primary-darkest"] = mix(accent, shade, 20);
    vars["color-brand-hover"] = mix(accent, shade, 10);
    vars["color-brand-active"] = mix(accent, shade, 20);
    vars["color-selection"] = accent;
    vars["color-logo-icon"] = accent;
  }
  if (surface) {
    vars["island-bg-color"] = surface;
    vars["popup-bg-color"] = surface;
    vars["sidebar-bg-color"] = surface;
    vars["default-bg-color"] = surface;
    vars["input-bg-color"] = surface;
    vars["color-surface-lowest"] = surface;
    if (text) {
      vars["color-surface-mid"] = mix(surface, text, 3);
      vars["color-surface-low"] = mix(surface, text, 6);
      vars["color-surface-high"] = mix(surface, text, 10);
      vars["input-hover-bg-color"] = mix(surface, text, 6);
    }
  }
  if (accent && surface) {
    vars["color-primary-light"] = mix(surface, accent, 30);
    vars["color-primary-light-darker"] = mix(surface, accent, 40);
    vars["color-surface-primary-container"] = mix(surface, accent, 35);
  }
  if (text) {
    vars["color-on-surface"] = text;
    vars["text-primary-color"] = text;
    vars["popup-text-color"] = text;
    vars["icon-fill-color"] = text;
  }
  if (border) {
    vars["default-border-color"] = border;
    vars["dialog-border-color"] = border;
    vars["input-border-color"] = border;
    vars["sidebar-border-color"] = border;
    vars["color-border-outline-variant"] = border;
  }
  if (palette.selection) {
    vars["color-selection"] = palette.selection;
  }
  if (palette.canvas) {
    vars["canvas-background-color"] = palette.canvas;
  }
  if (palette.grid) {
    vars["grid-color"] = palette.grid;
  }
  if (palette["grid-bold"]) {
    vars["grid-bold-color"] = palette["grid-bold"];
  }
  return vars;
};

const VAR_NAME = /^[a-z0-9-]+$/;
// characters that could end the declaration or the rule
const UNSAFE_VALUE = /[;{}<>]/;

/** Drops invalid entries and reports them in the devtools console. */
const validate = (palette: Palette, mode: string): Palette => {
  const valid: Palette = { vars: {} };
  for (const [key, value] of Object.entries(palette)) {
    if (key === "vars" || value == null) {
      continue;
    }
    if (CSS.supports("color", value as string)) {
      valid[key as ColorKey] = value as string;
    } else {
      console.warn(`[theme.${mode}] ${key}: not a CSS color: ${value}`);
    }
  }
  for (const [name, value] of Object.entries(palette.vars)) {
    if (VAR_NAME.test(name) && !UNSAFE_VALUE.test(value)) {
      valid.vars[name] = value;
    } else {
      console.warn(
        `[theme.${mode}.vars] invalid entry: "${name}" = "${value}"`,
      );
    }
  }
  return valid;
};

/** The stylesheet that applies the colors of `[theme.light]` and `[theme.dark]`. */
export function toThemeCss(config: AppConfig): string {
  return (["light", "dark"] as const)
    .map((mode) => {
      const palette = validate(config.theme[mode], mode);
      const vars = { ...toVars(palette, mode), ...palette.vars };
      const body = Object.entries(vars)
        .map(([name, value]) => `  --${name}: ${value};`)
        .join("\n");
      return body && `${SELECTORS[mode]} {\n${body}\n}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function applyThemeCss(config: AppConfig) {
  const style = document.createElement("style");
  style.id = "zen-theme";
  style.textContent = toThemeCss(config);
  document.head.appendChild(style);
}
