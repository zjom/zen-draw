import React from "react";
import { vi } from "vitest";

import { KEYS, POINTER_BUTTON } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";

import { Excalidraw } from "../index";
import { setLegacyLayerUI } from "../components/zen/legacyLayerUI";
import { getRingSliceIndex, RING_RADIUS } from "../components/App.ring";

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

describe("getRingSliceIndex()", () => {
  it("returns the slice in the direction of the point", () => {
    const center = { x: 0, y: 0 };
    expect(getRingSliceIndex(center, { x: 0, y: -50 }, 4)).toBe(0);
    expect(getRingSliceIndex(center, { x: 50, y: 0 }, 4)).toBe(1);
    expect(getRingSliceIndex(center, { x: 0, y: 500 }, 4)).toBe(2);
    expect(getRingSliceIndex(center, { x: -50, y: -10 }, 4)).toBe(3);
  });

  it("returns null in the dead zone", () => {
    expect(getRingSliceIndex({ x: 0, y: 0 }, { x: 10, y: 10 }, 4)).toBe(null);
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
      const target = towards(CENTER, 2, MAIN_SLICES, RING_RADIUS * 2);
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

      const subCenter = towards(CENTER, 8, MAIN_SLICES, RING_RADIUS + 10);
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
      expect(center.x).toBeGreaterThanOrEqual(RING_RADIUS);
      expect(center.y).toBeGreaterThanOrEqual(RING_RADIUS);
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
  describe("style ring", () => {
    const queryStyleRing = () =>
      container().querySelector<HTMLElement>('[data-testid="style-ring"]');

    /** a selected rectangle around the center */
    const selectRectangle = (
      opts: Partial<Parameters<typeof API.createElement>[0]> = {},
    ) => {
      const rectangle = API.createElement({
        type: "rectangle",
        x: CENTER.x - 50,
        y: CENTER.y - 50,
        width: 100,
        height: 100,
        ...opts,
      });
      // recorded, so that an undo restores the rectangle
      API.updateScene({
        elements: [rectangle],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      API.setSelectedElements([rectangle]);
      return rectangle;
    };

    const sliceIds = () =>
      h.app.styleRing.getState()?.slices.map((slice) => slice.id);

    const indexOf = (id: string) => sliceIds()!.indexOf(id);

    it("opens on a secondary-button drag on the selection", async () => {
      await renderEditor();
      selectRectangle();
      dragTo({ x: CENTER.x + 20, y: CENTER.y });

      expect(queryStyleRing()).not.toBe(null);
      expect(queryRing()).toBe(null);
      // only the properties of the rectangle (the background is
      // transparent, so the fill style does not apply)
      expect(sliceIds()).toEqual([
        "strokeColor",
        "backgroundColor",
        "opacity",
        "strokeWidth",
        "strokeStyle",
        "sloppiness",
        "edges",
        "layers",
      ]);
      release({ x: CENTER.x + 20, y: CENTER.y });
      expect(queryStyleRing()).toBe(null);
    });

    it("opens the tool ring off the selection", async () => {
      await renderEditor();
      selectRectangle({ x: 0, y: 0 });
      dragTo({ x: CENTER.x + 20, y: CENTER.y });
      expect(queryStyleRing()).toBe(null);
      expect(queryRing()).not.toBe(null);
      release({ x: CENTER.x + 20, y: CENTER.y });
    });

    it("changes a property in one undo entry", async () => {
      await renderEditor();
      const rectangle = selectRectangle();
      dragTo({ x: CENTER.x + 20, y: CENTER.y });
      const count = sliceIds()!.length;
      const index = indexOf("strokeWidth");

      // past the outer edge: the sub-ring of the values
      const subCenter = towards(CENTER, index, count, RING_RADIUS + 10);
      fireEvent.pointerMove(canvas(), secondary(subCenter.x, subCenter.y));
      const state = h.app.styleRing.getState()!;
      expect(state.level).toBe("strokeWidth");
      expect(sliceIds()).toEqual([
        "strokeWidth.thin",
        "strokeWidth.medium",
        "strokeWidth.bold",
      ]);
      // the current value
      expect(state.slices.map((slice) => !!slice.active)).toEqual([
        false,
        true,
        false,
      ]);

      const undoCount = API.getUndoStack().length;
      const target = towards(state.center, 2, 3);
      fireEvent.pointerMove(canvas(), secondary(target.x, target.y));
      release(target);

      expect(queryStyleRing()).toBe(null);
      expect(API.getElement(rectangle).strokeWidth).toBe(4);
      expect(API.getUndoStack().length).toBe(undoCount + 1);

      Keyboard.undo();
      expect(API.getElement(rectangle).strokeWidth).toBe(2);
    });

    it("opens the sub-ring in place on a release on a property", async () => {
      await renderEditor();
      const rectangle = selectRectangle();
      dragTo({ x: CENTER.x + 20, y: CENTER.y });
      const target = towards(
        CENTER,
        indexOf("strokeStyle"),
        sliceIds()!.length,
      );
      fireEvent.pointerMove(canvas(), secondary(target.x, target.y));
      release(target);

      const state = h.app.styleRing.getState()!;
      expect(state.level).toBe("strokeStyle");
      expect(state.sticky).toBe(true);
      expect(state.center).toEqual(CENTER);

      // a click picks a value
      const dashed = towards(CENTER, 1, 3);
      fireEvent.pointerDown(window, {
        button: POINTER_BUTTON.MAIN,
        clientX: dashed.x,
        clientY: dashed.y,
      });
      expect(queryStyleRing()).toBe(null);
      expect(API.getElement(rectangle).strokeStyle).toBe("dashed");
    });

    it("runs a layer action", async () => {
      await renderEditor();
      const back = API.createElement({ type: "ellipse", x: 0, y: 0 });
      const rectangle = API.createElement({
        type: "rectangle",
        x: CENTER.x - 50,
        y: CENTER.y - 50,
        width: 100,
        height: 100,
      });
      API.setElements([back, rectangle]);
      API.setSelectedElements([rectangle]);

      dragTo({ x: CENTER.x + 20, y: CENTER.y });
      const target = towards(CENTER, indexOf("layers"), sliceIds()!.length);
      fireEvent.pointerMove(canvas(), secondary(target.x, target.y));
      release(target);
      expect(sliceIds()?.[0]).toBe("layers.sendToBack");
      fireEvent.keyDown(document, { key: "1", code: "Digit1" });
      expect(h.elements.map((element) => element.id)).toEqual([
        rectangle.id,
        back.id,
      ]);
    });

    it("opens the color picker at the color slice", async () => {
      // radix popovers need a ResizeObserver
      (global as any).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      await renderEditor();
      selectRectangle();
      dragTo({ x: CENTER.x + 20, y: CENTER.y });
      const target = towards(
        CENTER,
        indexOf("strokeColor"),
        sliceIds()!.length,
      );
      fireEvent.pointerMove(canvas(), secondary(target.x, target.y));
      release(target);

      expect(queryStyleRing()).toBe(null);
      expect(h.state.openPopup).toBe("elementStroke");
      expect(document.querySelector(".StyleRingColorPicker__anchor")).not.toBe(
        null,
      );
      expect(document.querySelector(".color-picker-content")).not.toBe(null);
    });

    it("opens the color picker at the pointer on the s key", async () => {
      (global as any).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      await renderEditor();
      selectRectangle();
      fireEvent.pointerMove(canvas(), {
        clientX: CENTER.x,
        clientY: CENTER.y,
      });
      Keyboard.keyPress("s");
      expect(h.state.openPopup).toBe("elementStroke");
      expect(h.app.styleRing.getColorPickerAnchor()).toEqual(CENTER);
      expect(document.querySelector(".color-picker-content")).not.toBe(null);
    });

    it("puts the rest of more than 8 properties in a more slice", async () => {
      await renderEditor();
      // a background adds the fill style: 9 properties
      selectRectangle({ backgroundColor: "#ffc9c9" });
      dragTo({ x: CENTER.x + 20, y: CENTER.y });
      const ids = sliceIds()!;
      expect(ids).toHaveLength(8);
      expect(ids[7]).toBe("more");

      const subCenter = towards(CENTER, 7, 8, RING_RADIUS + 10);
      fireEvent.pointerMove(canvas(), secondary(subCenter.x, subCenter.y));
      expect(sliceIds()).toEqual(["edges", "layers"]);
      release(subCenter);
    });

    it("opens with ui.styleRing", async () => {
      await renderEditor();
      fireEvent.pointerMove(canvas(), {
        clientX: CENTER.x,
        clientY: CENTER.y,
      });
      act(() => {
        h.app.api.commands.execute("ui.styleRing");
      });
      expect(h.app.styleRing.getState()?.sticky).toBe(true);
      expect(h.app.styleRing.getState()?.center).toEqual(CENTER);
    });

    it("opens on a secondary-button drag with Shift off the selection", async () => {
      await renderEditor();
      selectRectangle({ x: 0, y: 0 });
      fireEvent.pointerDown(canvas(), {
        ...secondary(CENTER.x, CENTER.y),
        shiftKey: true,
      });
      fireEvent.pointerMove(canvas(), secondary(CENTER.x + 20, CENTER.y));
      expect(queryStyleRing()).not.toBe(null);
      expect(queryRing()).toBe(null);
      // the selection, not the defaults
      expect(h.app.styleRing.editsDefaults()).toBe(false);
      release({ x: CENTER.x + 20, y: CENTER.y });
    });

    describe("with nothing selected", () => {
      const openWithShift = () => {
        fireEvent.pointerDown(canvas(), {
          ...secondary(CENTER.x, CENTER.y),
          shiftKey: true,
        });
        fireEvent.pointerMove(canvas(), secondary(CENTER.x + 20, CENTER.y));
      };

      it("shows the properties of the active tool", async () => {
        await renderEditor();
        Keyboard.keyPress("a");
        openWithShift();
        expect(container().querySelector(".Ring__center--defaults")).not.toBe(
          null,
        );
        expect(sliceIds()).toEqual([
          "strokeColor",
          "opacity",
          "strokeWidth",
          "strokeStyle",
          "sloppiness",
          "startArrowhead",
          "endArrowhead",
          "arrowType",
        ]);
        release({ x: CENTER.x + 20, y: CENTER.y });
      });

      it("shows the properties of all tools for the selection tool", async () => {
        await renderEditor();
        openWithShift();
        const ids = sliceIds()!;
        expect(ids[7]).toBe("more");
        const subCenter = towards(CENTER, 7, 8, RING_RADIUS + 10);
        fireEvent.pointerMove(canvas(), secondary(subCenter.x, subCenter.y));
        // no layers: they apply to elements only
        expect([...ids.slice(0, 7), ...sliceIds()!]).toEqual([
          "strokeColor",
          "backgroundColor",
          "opacity",
          "strokeWidth",
          "strokeStyle",
          "sloppiness",
          "edges",
          "fontFamily",
          "fontSize",
          "textAlign",
          "startArrowhead",
          "endArrowhead",
          "arrowType",
        ]);
        release(subCenter);
      });

      it("changes the defaults of new elements", async () => {
        await renderEditor();
        Keyboard.keyPress("r");
        openWithShift();
        const count = sliceIds()!.length;
        const subCenter = towards(
          CENTER,
          indexOf("strokeWidth"),
          count,
          RING_RADIUS + 10,
        );
        fireEvent.pointerMove(canvas(), secondary(subCenter.x, subCenter.y));
        const state = h.app.styleRing.getState()!;
        // the current default
        expect(state.slices.map((slice) => !!slice.active)).toEqual([
          false,
          true,
          false,
        ]);
        const target = towards(state.center, 2, 3);
        fireEvent.pointerMove(canvas(), secondary(target.x, target.y));
        release(target);

        expect(h.state.currentItemStrokeWidthKey).toBe("bold");
        expect(h.elements).toEqual([]);
      });
    });
  });
});
