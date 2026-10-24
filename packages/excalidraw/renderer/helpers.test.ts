import { COLOR_WHITE, THEME, applyDarkModeFilter } from "@excalidraw/common";

import {
  bootstrapCanvas,
  getDisplayedViewBackground,
  getThemeCanvasColors,
} from "./helpers";

const setup = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 100;
  const context = canvas.getContext("2d")!;
  const clearRect = vi.spyOn(context, "clearRect");
  const fillRect = vi.spyOn(context, "fillRect");
  return { canvas, context, clearRect, fillRect };
};

const run = (viewBackgroundColor: unknown) => {
  const { canvas, context, clearRect, fillRect } = setup();
  bootstrapCanvas({
    canvas,
    scale: 1,
    normalizedWidth: 200,
    normalizedHeight: 100,
    viewBackgroundColor: viewBackgroundColor as string,
  });
  return { context, clearRect, fillRect };
};

describe("bootstrapCanvas background painting", () => {
  it("skips clearRect for an opaque hex color (fill fully repaints)", () => {
    const { clearRect, fillRect } = run("#ffffff");
    expect(clearRect).not.toHaveBeenCalled();
    expect(fillRect).toHaveBeenCalledTimes(1);
  });

  it("skips clearRect for a 3-digit opaque hex color", () => {
    const { clearRect, fillRect } = run("#fff");
    expect(clearRect).not.toHaveBeenCalled();
    expect(fillRect).toHaveBeenCalledTimes(1);
  });

  it("clears for a hex color with alpha (#RGBA / #RRGGBBAA)", () => {
    expect(run("#ffff").clearRect).toHaveBeenCalledTimes(1);
    expect(run("#ffffff80").clearRect).toHaveBeenCalledTimes(1);
  });

  it("clears and skips fill for the transparent keyword", () => {
    const { clearRect, fillRect } = run("transparent");
    expect(clearRect).toHaveBeenCalledTimes(1);
    expect(fillRect).not.toHaveBeenCalled();
  });

  it("clears for rgba()/hsla() colors and still fills", () => {
    const rgba = run("rgba(255, 0, 0, 0.5)");
    expect(rgba.clearRect).toHaveBeenCalledTimes(1);
    expect(rgba.fillRect).toHaveBeenCalledTimes(1);
  });

  // the ghosting bug (#10931): a corrupted value must never leave the prior
  // frame on screen — we always clear when we can't prove the color is opaque
  it("clears for a corrupted color value to prevent ghosting", () => {
    expect(run("0000").clearRect).toHaveBeenCalledTimes(1);
    expect(run("asdfgh").clearRect).toHaveBeenCalledTimes(1);
  });

  it("falls back to white when the color is rejected by the canvas", () => {
    const { canvas, context } = setup();
    // simulate a stale fillStyle left over from a previous frame's drawing
    context.fillStyle = "#ff0000";
    let fillStyleAtFillTime = "";
    vi.spyOn(context, "fillRect").mockImplementation(() => {
      fillStyleAtFillTime = context.fillStyle as string;
    });

    bootstrapCanvas({
      canvas,
      scale: 1,
      normalizedWidth: 200,
      normalizedHeight: 100,
      viewBackgroundColor: "not-a-color",
    });

    // not the stale red — the seeded default
    expect(fillStyleAtFillTime).toBe(COLOR_WHITE);
  });

  it("clears for a non-string background", () => {
    const { clearRect, fillRect } = run(undefined);
    expect(clearRect).toHaveBeenCalledTimes(1);
    expect(fillRect).not.toHaveBeenCalled();
  });
});

describe("theme canvas colors", () => {
  it("reads the CSS variables and leaves out unset ones", () => {
    const element = document.createElement("div");
    element.style.setProperty("--canvas-background-color", "#1a1b26");
    element.style.setProperty("--grid-color", " #24283b ");
    document.body.appendChild(element);
    expect(getThemeCanvasColors(element)).toEqual({
      background: "#1a1b26",
      grid: "#24283b",
      gridBold: undefined,
    });
    element.remove();
    expect(getThemeCanvasColors(null)).toEqual({});
  });

  it("shows the theme background only over the default background", () => {
    expect(getDisplayedViewBackground("#FFFFFF", THEME.DARK, "#1a1b26")).toBe(
      "#1a1b26",
    );
    expect(getDisplayedViewBackground("#ffc9c9", THEME.LIGHT, "#1a1b26")).toBe(
      "#ffc9c9",
    );
    expect(getDisplayedViewBackground("#ffc9c9", THEME.DARK, "#1a1b26")).toBe(
      applyDarkModeFilter("#ffc9c9"),
    );
    expect(getDisplayedViewBackground(COLOR_WHITE, THEME.DARK)).toBe(
      applyDarkModeFilter(COLOR_WHITE),
    );
  });
});
