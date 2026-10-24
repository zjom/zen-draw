import React from "react";
import { vi } from "vitest";

import { KEYS, POINTER_BUTTON } from "@excalidraw/common";

import { Excalidraw } from "../index";
import { setLegacyLayerUI } from "../components/zen/legacyLayerUI";
import {
  getToolRingSliceIndex,
  TOOL_RING_RADIUS,
} from "../components/App.toolRing";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, fireEvent, GlobalTestState, render } from "./test-utils";

import type { ExcalidrawProps } from "../types";

const { h } = window;

const secondary = (clientX: number, clientY: number) => ({
  pointerId: 1,
  pointerType: "mouse",
  button: POINTER_BUTTON.SECONDARY,
  buttons: 2,
  clientX,
  clientY,
});

const canvas = () => GlobalTestState.interactiveCanvas;
const container = () => GlobalTestState.renderResult.container;
const queryRing = () =>
  container().querySelector<HTMLElement>('[data-testid="tool-ring"]');

/** a point at `distance` from `center` in the direction of slice `index` of
 * `count` slices (slice 0 points up, clockwise) */
const towards = (
  center: { x: number; y: number },
  index: number,
  count: number,
  distance = 60,
) => {
  const angle = (index * Math.PI * 2) / count;
  return {
    x: center.x + distance * Math.sin(angle),
    y: center.y - distance * Math.cos(angle),
  };
};

const CENTER = { x: 400, y: 300 };
/** 8 items and the "more" slice */
const MAIN_SLICES = 9;

const renderEditor = async (props: ExcalidrawProps = {}) => {
  await render(<Excalidraw handleKeyboardGlobally {...props} />);
  // jsdom has no layout: give the editor a size for the ring to fit in
  API.setAppState({ width: 1000, height: 800, offsetLeft: 0, offsetTop: 0 });
};

/** presses the secondary button at the center and drags towards `point` */
const dragTo = (point: { x: number; y: number }) => {
  fireEvent.pointerDown(canvas(), secondary(CENTER.x, CENTER.y));
  fireEvent.pointerMove(canvas(), secondary(point.x, point.y));
};

const release = (point: { x: number; y: number }, shiftKey = false) => {
  fireEvent.pointerUp(window, {
    ...secondary(point.x, point.y),
    buttons: 0,
    shiftKey,
  });
};

describe("getToolRingSliceIndex()", () => {
  it("returns the slice in the direction of the point", () => {
    const center = { x: 0, y: 0 };
    expect(getToolRingSliceIndex(center, { x: 0, y: -50 }, 4)).toBe(0);
    expect(getToolRingSliceIndex(center, { x: 50, y: 0 }, 4)).toBe(1);
    expect(getToolRingSliceIndex(center, { x: 0, y: 500 }, 4)).toBe(2);
    expect(getToolRingSliceIndex(center, { x: -50, y: -10 }, 4)).toBe(3);
  });

  it("returns null in the dead zone", () => {
    expect(getToolRingSliceIndex({ x: 0, y: 0 }, { x: 10, y: 10 }, 4)).toBe(
      null,
    );
  });
});

describe("ZenLayerUI", () => {
  beforeAll(() => {
    setLegacyLayerUI(false);
  });

  afterAll(() => {
    setLegacyLayerUI(true);
  });

  it("renders no toolbar, menu, footer or help text", async () => {
    await renderEditor();
    expect(container().querySelector(".App-toolbar")).toBe(null);
    expect(container().querySelector(".main-menu-trigger")).toBe(null);
    expect(container().querySelector(".layer-ui__wrapper__footer")).toBe(null);
    expect(container().querySelector(".HintViewer")).toBe(null);
    expect(container().querySelector(".welcome-screen-center")).toBe(null);
    expect(container().querySelector(".App-menu")).toBe(null);
  });

  it("shows the tool indicator unless disabled", async () => {
    await renderEditor();
    const indicator = () =>
      container().querySelector('[data-testid="tool-indicator"]');
    expect(indicator()?.getAttribute("data-tool")).toBe("selection");
    Keyboard.keyPress("r");
    expect(indicator()?.getAttribute("data-tool")).toBe("rectangle");

    GlobalTestState.renderResult.rerender(
      <Excalidraw handleKeyboardGlobally toolIndicator={false} />,
    );
    expect(indicator()).toBe(null);
  });

  describe("tool ring", () => {
    it("opens on a secondary-button drag and selects a tool", async () => {
      await renderEditor();
      const scrollX = h.state.scrollX;
      const target = towards(CENTER, 1, MAIN_SLICES);
      dragTo(target);

      expect(queryRing()).not.toBe(null);
      expect(
        container().querySelector(
          '[data-testid="tool-ring-slice-tool.rectangle"]',
        ),
      ).not.toBe(null);
      expect(h.app.toolRing.getState()?.highlighted).toBe(1);

      release(target);
      expect(queryRing()).toBe(null);
      expect(h.state.activeTool.type).toBe("rectangle");
      expect(h.state.activeTool.locked).toBe(false);
      // the drag does not pan, nor open the context menu
      expect(h.state.scrollX).toBe(scrollX);
      expect(h.state.contextMenu).toBe(null);
    });

    it("selects by direction, not by distance", async () => {
      await renderEditor();
      const target = towards(CENTER, 2, MAIN_SLICES, TOOL_RING_RADIUS * 2);
      dragTo(target);
      release(target);
      expect(h.state.activeTool.type).toBe("ellipse");
    });

    it("locks the tool when Shift is held on release", async () => {
      await renderEditor();
      const target = towards(CENTER, 6, MAIN_SLICES);
      dragTo(target);
      release(target, true);
      expect(h.state.activeTool.type).toBe("freedraw");
      expect(h.state.activeTool.locked).toBe(true);
    });

    it("runs no command on a release in the dead zone", async () => {
      await renderEditor();
      dragTo(towards(CENTER, 1, MAIN_SLICES));
      fireEvent.pointerMove(canvas(), secondary(CENTER.x + 5, CENTER.y + 5));
      release({ x: CENTER.x + 5, y: CENTER.y + 5 });
      expect(queryRing()).toBe(null);
      expect(h.state.activeTool.type).toBe("selection");
    });

    it("closes on Escape", async () => {
      await renderEditor();
      const target = towards(CENTER, 1, MAIN_SLICES);
      dragTo(target);
      Keyboard.keyDown(KEYS.ESCAPE);
      expect(queryRing()).toBe(null);
      release(target);
      expect(h.state.activeTool.type).toBe("selection");
    });

    it("opens the sub-ring past the outer edge of the more slice", async () => {
      await renderEditor();
      dragTo(towards(CENTER, 8, MAIN_SLICES));
      expect(h.app.toolRing.getState()?.level).toBe("main");

      const subCenter = towards(CENTER, 8, MAIN_SLICES, TOOL_RING_RADIUS + 10);
      fireEvent.pointerMove(canvas(), secondary(subCenter.x, subCenter.y));
      const state = h.app.toolRing.getState()!;
      expect(state.level).toBe("more");
      expect(state.slices).toHaveLength(8);

      // the eraser is the first item of the sub-ring
      const target = towards(state.center, 0, 8);
      fireEvent.pointerMove(canvas(), secondary(target.x, target.y));
      release(target);
      expect(h.state.activeTool.type).toBe("eraser");
    });

    it("moves into the editor near an edge", async () => {
      await renderEditor();
      fireEvent.pointerDown(canvas(), secondary(5, 5));
      fireEvent.pointerMove(canvas(), secondary(20, 20));
      const { center } = h.app.toolRing.getState()!;
      expect(center.x).toBeGreaterThanOrEqual(TOOL_RING_RADIUS);
      expect(center.y).toBeGreaterThanOrEqual(TOOL_RING_RADIUS);
      release({ x: 20, y: 20 });
    });

    it("keeps the context menu on a click without a drag", async () => {
      await renderEditor();
      fireEvent.pointerDown(canvas(), secondary(CENTER.x, CENTER.y));
      fireEvent.pointerMove(canvas(), secondary(CENTER.x + 2, CENTER.y + 2));
      release({ x: CENTER.x + 2, y: CENTER.y + 2 });
      fireEvent.contextMenu(canvas(), secondary(CENTER.x + 2, CENTER.y + 2));
      expect(queryRing()).toBe(null);
      expect(h.state.contextMenu).not.toBe(null);
    });

    it("uses the toolRing prop", async () => {
      const run = vi.fn();
      await renderEditor({
        toolRing: { items: ["tool.text", "host.hello"] },
        commands: { "host.hello": { label: "Hello", run } },
      });
      // two slices, no "more" slice
      const target = towards(CENTER, 1, 2);
      dragTo(target);
      expect(h.app.toolRing.getState()?.slices).toHaveLength(2);
      release(target);
      expect(run).toHaveBeenCalledTimes(1);
    });

    it("pans instead in view mode", async () => {
      await renderEditor({ viewModeEnabled: true });
      const scrollX = h.state.scrollX;
      dragTo({ x: CENTER.x + 40, y: CENTER.y });
      fireEvent.pointerMove(canvas(), secondary(CENTER.x + 60, CENTER.y));
      expect(queryRing()).toBe(null);
      release({ x: CENTER.x + 60, y: CENTER.y });
      expect(h.state.scrollX).not.toBe(scrollX);
    });

    describe("ui.toolRing", () => {
      const pressRingKey = () =>
        fireEvent.keyDown(document, { key: "y", code: "KeyY" });
      const releaseRingKey = () =>
        fireEvent.keyUp(document, { key: "y", code: "KeyY" });

      it("opens at the pointer and runs the slice on the key release", async () => {
        await renderEditor({ keymap: { "ui.toolRing": "y" } });
        fireEvent.pointerMove(canvas(), {
          clientX: CENTER.x,
          clientY: CENTER.y,
        });
        pressRingKey();
        expect(h.app.toolRing.getState()?.center).toEqual(CENTER);

        const target = towards(CENTER, 3, MAIN_SLICES);
        fireEvent.pointerMove(window, { clientX: target.x, clientY: target.y });
        releaseRingKey();
        expect(queryRing()).toBe(null);
        expect(h.state.activeTool.type).toBe("diamond");
      });

      it("stays open after a release in the dead zone", async () => {
        await renderEditor({ keymap: { "ui.toolRing": "y" } });
        fireEvent.pointerMove(canvas(), {
          clientX: CENTER.x,
          clientY: CENTER.y,
        });
        pressRingKey();
        releaseRingKey();
        expect(h.app.toolRing.getState()?.sticky).toBe(true);

        // a digit key picks a slice
        fireEvent.keyDown(document, { key: "5", code: "Digit5" });
        expect(queryRing()).toBe(null);
        expect(h.state.activeTool.type).toBe("arrow");
      });

      it("picks a slice of a sticky ring with a click", async () => {
        await renderEditor();
        fireEvent.pointerMove(canvas(), {
          clientX: CENTER.x,
          clientY: CENTER.y,
        });
        act(() => {
          h.app.api.commands.execute("ui.toolRing");
        });
        const target = towards(CENTER, 7, MAIN_SLICES);
        fireEvent.pointerDown(window, {
          button: POINTER_BUTTON.MAIN,
          clientX: target.x,
          clientY: target.y,
        });
        expect(h.state.activeTool.type).toBe("text");
      });
    });
  });
});
