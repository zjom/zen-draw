import React from "react";
import { vi } from "vitest";

import { KEYS } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard, Pointer, UI } from "./helpers/ui";
import { getTextEditor } from "./queries/dom";
import { act, fireEvent, GlobalTestState, render } from "./test-utils";

import type { ExcalidrawProps } from "../types";

const { h } = window;
const mouse = new Pointer("mouse");

const renderEditor = (props: ExcalidrawProps = {}) =>
  render(<Excalidraw handleKeyboardGlobally {...props} />);

const rerenderEditor = (props: ExcalidrawProps) =>
  GlobalTestState.renderResult.rerender(
    <Excalidraw handleKeyboardGlobally {...props} />,
  );

const getToolButtonTitle = (type: string) =>
  GlobalTestState.renderResult.container
    .querySelector(`[data-testid="toolbar-${type}"]`)
    ?.getAttribute("title");

describe("keymap", () => {
  beforeEach(() => {
    mouse.reset();
  });

  describe("tools", () => {
    it("selects tools with the default key combinations", async () => {
      await renderEditor();

      Keyboard.keyPress("r");
      expect(h.state.activeTool.type).toBe("rectangle");
      Keyboard.keyPress("3");
      expect(h.state.activeTool.type).toBe("diamond");
      // CapsLock
      Keyboard.keyPress("O");
      expect(h.state.activeTool.type).toBe("ellipse");
      Keyboard.withModifierKeys({ shift: true }, () => {
        Keyboard.keyPress("X");
      });
      expect(h.state.activeTool.type).toBe("autoshape");
      Keyboard.keyPress("x");
      expect(h.state.activeTool.type).toBe("freedraw");
    });

    it("does not select a tool when a different modifier is held", async () => {
      await renderEditor();

      Keyboard.withModifierKeys({ shift: true }, () => {
        Keyboard.keyPress("R");
      });
      expect(h.state.activeTool.type).toBe("selection");
      Keyboard.withModifierKeys({ alt: true }, () => {
        Keyboard.keyPress("r");
      });
      expect(h.state.activeTool.type).toBe("selection");
    });

    it("activates the preferred selection tool", async () => {
      await renderEditor();

      act(() => {
        h.setState({
          preferredSelectionTool: { type: "lasso", initialized: true },
        });
      });
      Keyboard.keyPress("r");
      Keyboard.keyPress("v");
      expect(h.state.activeTool.type).toBe("lasso");
    });

    it("changes the tool of a key with an override", async () => {
      await renderEditor({ keymap: { "tool.freedraw": "d" } });

      Keyboard.keyPress("d");
      expect(h.state.activeTool.type).toBe("freedraw");
      // the other default key combinations of freedraw are gone
      Keyboard.keyPress("r");
      Keyboard.keyPress("p");
      expect(h.state.activeTool.type).toBe("rectangle");
      // diamond keeps its other default key combination
      Keyboard.keyPress("3");
      expect(h.state.activeTool.type).toBe("diamond");

      expect(h.app.api.keymap.conflicts()).toEqual([
        { keys: "d", ids: ["tool.freedraw", "tool.diamond"] },
      ]);
    });

    it("disables the default key combinations with null", async () => {
      await renderEditor({ keymap: { "tool.rectangle": null } });

      Keyboard.keyPress("r");
      Keyboard.keyPress("2");
      expect(h.state.activeTool.type).toBe("selection");
    });

    it("resolves the keymap again when the prop changes", async () => {
      await renderEditor({ keymap: { "tool.rectangle": "g" } });
      Keyboard.keyPress("g");
      expect(h.state.activeTool.type).toBe("rectangle");

      rerenderEditor({ keymap: { "tool.ellipse": "g" } });
      Keyboard.keyPress("g");
      expect(h.state.activeTool.type).toBe("ellipse");
      Keyboard.keyPress("r");
      expect(h.state.activeTool.type).toBe("rectangle");
    });

    it("shows the key combinations of the override in the tooltip", async () => {
      await renderEditor();
      expect(getToolButtonTitle("rectangle")).toBe("Rectangle — R or 2");

      rerenderEditor({ keymap: { "tool.rectangle": ["shift+r"] } });
      expect(getToolButtonTitle("rectangle")).toBe("Rectangle — Shift+R");
    });
  });

  describe("actions", () => {
    it("runs an action only if its key condition passes", async () => {
      await renderEditor();
      const rectangle = API.createElement({ type: "rectangle" });
      API.setElements([rectangle]);

      // toggleWrap needs a selection
      Keyboard.keyPress("w");
      expect(h.elements).toHaveLength(1);

      API.setSelectedElements([rectangle]);
      Keyboard.withModifierKeys({ ctrl: true }, () => {
        Keyboard.keyPress("d");
      });
      expect(h.elements).toHaveLength(2);
    });

    it("moves an action to a different key", async () => {
      await renderEditor({ keymap: { undo: "alt+u" } });
      UI.clickTool("rectangle");
      mouse.down(10, 10);
      mouse.up(50, 50);
      expect(h.elements).toHaveLength(1);

      Keyboard.undo();
      expect(h.elements[0].isDeleted).toBe(false);
      Keyboard.withModifierKeys({ alt: true }, () => {
        Keyboard.keyPress("u");
      });
      expect(h.elements[0].isDeleted).toBe(true);
    });

    it("opens the help dialog with ?", async () => {
      await renderEditor();
      Keyboard.withModifierKeys({ shift: true }, () => {
        Keyboard.keyPress("?");
      });
      expect(h.state.openDialog?.name).toBe("help");
    });
  });

  describe("ui commands", () => {
    it("opens the image export dialog", async () => {
      await renderEditor();
      Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => {
        Keyboard.keyPress("E");
      });
      expect(h.state.openDialog?.name).toBe("imageExport");
    });

    it("toggles the tool lock", async () => {
      await renderEditor({ keymap: { "ui.toolLock": "alt+l" } });
      Keyboard.keyPress("q");
      expect(h.state.activeTool.locked).toBe(false);
      Keyboard.withModifierKeys({ alt: true }, () => {
        Keyboard.keyPress("l");
      });
      expect(h.state.activeTool.locked).toBe(true);
    });

    it("toggles the command palette", async () => {
      await renderEditor({ keymap: { "ui.commandPalette": "mod+k" } });
      Keyboard.withModifierKeys({ ctrl: true }, () => {
        Keyboard.keyPress("k");
      });
      expect(h.state.openDialog?.name).toBe("commandPalette");
      Keyboard.withModifierKeys({ ctrl: true }, () => {
        Keyboard.keyPress("k");
      });
      expect(h.state.openDialog).toBe(null);
    });
  });

  describe("host commands", () => {
    it("runs a host command on its key combination", async () => {
      const run = vi.fn();
      await renderEditor({
        commands: { "host.save": { label: "Save", keys: "mod+s", run } },
      });

      Keyboard.withModifierKeys({ ctrl: true }, () => {
        Keyboard.keyPress("s");
      });
      expect(run).toHaveBeenCalledTimes(1);
    });

    it("uses the override of a host command", async () => {
      const run = vi.fn();
      await renderEditor({
        commands: { "host.save": { label: "Save", keys: "mod+s", run } },
        keymap: { "host.save": "alt+s" },
      });

      Keyboard.withModifierKeys({ ctrl: true }, () => {
        Keyboard.keyPress("s");
      });
      expect(run).not.toHaveBeenCalled();
      Keyboard.withModifierKeys({ alt: true }, () => {
        Keyboard.keyPress("s");
      });
      expect(run).toHaveBeenCalledTimes(1);
    });

    it("calls onPress and onRelease of a press command", async () => {
      const onPress = vi.fn();
      const onRelease = vi.fn();
      await renderEditor({
        commands: {
          "host.peek": { label: "Peek", keys: "y", onPress, onRelease },
        },
      });

      fireEvent.keyDown(document, { key: "y", code: "KeyY" });
      // a repeated keydown is ignored
      fireEvent.keyDown(document, { key: "y", code: "KeyY", repeat: true });
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onRelease).not.toHaveBeenCalled();
      fireEvent.keyUp(document, { key: "y", code: "KeyY" });
      expect(onRelease).toHaveBeenCalledTimes(1);

      // the window loses focus before the release
      fireEvent.keyDown(document, { key: "y", code: "KeyY" });
      fireEvent.blur(window);
      expect(onRelease).toHaveBeenCalledTimes(2);
      fireEvent.keyUp(document, { key: "y", code: "KeyY" });
      expect(onRelease).toHaveBeenCalledTimes(2);
    });

    it("commits the text before a host command with Ctrl or Cmd", async () => {
      let editingWhenSaved: unknown = "not saved";
      const run = vi.fn(() => {
        editingWhenSaved = h.state.editingTextElement;
      });
      await renderEditor({
        commands: { "host.save": { label: "Save", keys: "mod+s", run } },
      });
      const text = UI.createElement("text");
      mouse.clickOn(text);
      const textarea = await getTextEditor();

      fireEvent.keyDown(textarea, { key: KEYS.S, ctrlKey: true });
      expect(run).toHaveBeenCalledTimes(1);
      expect(editingWhenSaved).toBe(null);
    });
  });

  describe("imperative API", () => {
    it("executes and lists commands", async () => {
      const run = vi.fn();
      await renderEditor({
        commands: { "host.open": { label: "Open", keys: "mod+o", run } },
        keymap: { "tool.ellipse": "e" },
      });
      const { api } = h.app;

      act(() => {
        expect(api.commands.execute("tool.rectangle")).toBe(true);
      });
      expect(h.state.activeTool.type).toBe("rectangle");
      expect(api.commands.execute("host.open")).toBe(true);
      expect(run).toHaveBeenCalledTimes(1);
      expect(api.commands.execute("host.nope")).toBe(false);

      const list = api.commands.list();
      expect(list).toContainEqual({
        id: "host.open",
        label: "Open",
        keys: ["mod+o"],
      });
      expect(list).toContainEqual({
        id: "tool.ellipse",
        label: "Ellipse",
        keys: ["e"],
      });
      expect(list).toContainEqual({
        id: "tool.eraser",
        label: "Eraser",
        keys: ["0"],
      });

      const keymap = api.keymap.get();
      expect(keymap.undo).toEqual(["mod+z"]);
      expect(keymap["tool.lasso"]).toEqual([]);
    });

    it("warns about an unknown command ID", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        await renderEditor({ keymap: { "tool.nope": "n" } as any });
        expect(warn).toHaveBeenCalledWith(
          'keymap: unknown command "tool.nope"',
        );
      } finally {
        warn.mockRestore();
      }
    });
  });
});
