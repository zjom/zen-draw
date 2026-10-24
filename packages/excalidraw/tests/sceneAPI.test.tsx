import React from "react";
import { vi } from "vitest";

import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";
import { actionToggleGridMode } from "../actions";
import { serializeAsJSON } from "../data/json";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, render } from "./test-utils";

const { h } = window;

const api = () => h.app.api;

const file = (
  elements: ExcalidrawElement[],
  appState: Record<string, unknown> = {},
) =>
  serializeAsJSON(
    elements,
    { viewBackgroundColor: "#ffc9c9", ...appState },
    {},
    "local",
  );

/** adds a rectangle as an undoable change */
const addRectangle = () => {
  const rectangle = API.createElement({ type: "rectangle" });
  act(() => {
    API.updateScene({
      elements: [...h.elements, rectangle],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  });
  return rectangle;
};

describe("scene API", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
  });

  describe("load()", () => {
    it("loads the contents of a file", async () => {
      addRectangle();
      const ellipse = API.createElement({ type: "ellipse" });
      await act(() =>
        api().scene.load(
          file([ellipse], { gridModeEnabled: true, gridSize: 40 }),
        ),
      );

      expect(h.elements.map((element) => element.id)).toEqual([ellipse.id]);
      expect(h.state.viewBackgroundColor).toBe("#ffc9c9");
      expect(h.state.gridModeEnabled).toBe(true);
      expect(h.state.gridSize).toBe(40);
      expect(API.getUndoStack()).toHaveLength(0);
      expect(api().scene.isDirty()).toBe(false);
    });

    it("keeps only the fields of AppState that belong to the document", async () => {
      await act(() =>
        api().scene.load(
          file([API.createElement({ type: "ellipse" })], {
            theme: "dark",
            currentItemStrokeColor: "#e03131",
            zoom: { value: 3 },
          }),
          { fitToContent: false },
        ),
      );
      expect(h.state.theme).toBe("light");
      expect(h.state.currentItemStrokeColor).not.toBe("#e03131");
      expect(h.state.zoom.value).toBe(1);
    });

    it("loads a Blob and the data of a scene", async () => {
      const ellipse = API.createElement({ type: "ellipse" });
      await act(() =>
        api().scene.load(
          new Blob([file([ellipse])], { type: "application/json" }),
        ),
      );
      expect(h.elements.map((element) => element.id)).toEqual([ellipse.id]);

      const diamond = API.createElement({ type: "diamond" });
      await act(() =>
        api().scene.load({
          elements: [diamond],
          appState: { viewBackgroundColor: "#a5d8ff" },
        }),
      );
      expect(h.elements.map((element) => element.id)).toEqual([diamond.id]);
      expect(h.state.viewBackgroundColor).toBe("#a5d8ff");
    });

    it("keeps the history with resetHistory: false", async () => {
      addRectangle();
      const undoCount = API.getUndoStack().length;
      await act(() => api().scene.load(file([]), { resetHistory: false }));
      expect(API.getUndoStack()).toHaveLength(undoCount);
    });

    it("rejects an invalid file", async () => {
      await expect(api().scene.load("not a file")).rejects.toThrow();
    });
  });

  describe("serialize()", () => {
    it("returns the contents of a file without the deleted elements", async () => {
      const rectangle = addRectangle();
      const ellipse = addRectangle();
      act(() => {
        API.updateScene({
          elements: h.elements.map((element) =>
            element.id === ellipse.id
              ? newElementWith(element, { isDeleted: true })
              : element,
          ),
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
      });

      const data = JSON.parse(api().scene.serialize());
      expect(data.type).toBe("excalidraw");
      expect(data.elements.map((element: any) => element.id)).toEqual([
        rectangle.id,
      ]);

      // the result loads
      await act(() => api().scene.load(api().scene.serialize()));
      expect(h.elements.map((element) => element.id)).toEqual([rectangle.id]);
    });
  });

  describe("dirty state", () => {
    it("is dirty after a change to the elements, until markSaved()", () => {
      const onDirtyChange = vi.fn();
      api().onDirtyChange(onDirtyChange);
      expect(api().scene.isDirty()).toBe(false);

      addRectangle();
      expect(api().scene.isDirty()).toBe(true);
      addRectangle();
      expect(onDirtyChange.mock.calls).toEqual([[true]]);

      api().scene.markSaved();
      expect(api().scene.isDirty()).toBe(false);
      expect(onDirtyChange.mock.calls).toEqual([[true], [false]]);
    });

    it("is not dirty after a change of the selection", () => {
      const rectangle = addRectangle();
      api().scene.markSaved();
      act(() => {
        api().selection.select(rectangle, {
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
      });
      expect(h.state.selectedElementIds[rectangle.id]).toBe(true);
      expect(api().scene.isDirty()).toBe(false);
    });

    it("is not dirty after an update that is not recorded", () => {
      act(() => {
        API.updateScene({
          elements: [API.createElement({ type: "rectangle" })],
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      });
      expect(api().scene.isDirty()).toBe(false);
    });

    it("is dirty after a change of the background color or the grid", () => {
      act(() => {
        API.updateScene({
          appState: { viewBackgroundColor: "#a5d8ff" },
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
      });
      expect(api().scene.isDirty()).toBe(true);

      api().scene.markSaved();
      act(() => {
        h.app.actionManager.executeAction(actionToggleGridMode);
      });
      expect(api().scene.isDirty()).toBe(true);
    });

    it("stays dirty after an undo to the saved state", () => {
      api().scene.markSaved();
      addRectangle();
      Keyboard.undo();
      expect(h.elements.filter((element) => !element.isDeleted)).toHaveLength(
        0,
      );
      expect(api().scene.isDirty()).toBe(true);
    });
  });
});
