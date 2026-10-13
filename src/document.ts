import {
  CaptureUpdateAction,
  hashElementsVersion,
  loadFromBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, message, open, save } from "@tauri-apps/plugin-dialog";

const FILTERS = [{ name: "Excalidraw", extensions: ["excalidraw"] }];

/** Owns the link between the editor and an `.excalidraw` file on disk. */
export class DocumentController {
  private api: ExcalidrawImperativeAPI | null = null;
  private path: string | null = null;
  private dirty = false;
  /** Scene version at the last load/save; any other version counts as unsaved. */
  private savedVersion = 0;

  /** Call once the Excalidraw API is available; returns the cleanup function. */
  attach(api: ExcalidrawImperativeAPI): () => void {
    this.api = api;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    this.savedVersion = hashElementsVersion(api.getSceneElementsIncludingDeleted());
    cleanups.push(
      api.onChange((elements) => {
        if (hashElementsVersion(elements) !== this.savedVersion) this.markDirty();
      }),
    );

    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (!(await this.confirmDiscard())) event.preventDefault();
      })
      .then((unlisten) => (disposed ? unlisten() : cleanups.push(unlisten)));

    void invoke<string | null>("initial_file").then((path) => {
      if (path && !disposed) void this.load(path);
    });

    this.updateTitle();
    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      this.api = null;
    };
  }

  async open() {
    if (!(await this.confirmDiscard())) return;
    const path = await open({ filters: FILTERS, multiple: false, directory: false });
    if (path) await this.load(path);
  }

  async save() {
    if (!this.path) return this.saveAs();
    await this.writeTo(this.path);
  }

  async saveAs() {
    const path = await save({ filters: FILTERS, defaultPath: this.path ?? "untitled.excalidraw" });
    if (path) await this.writeTo(path);
  }

  private async load(path: string) {
    const api = this.api;
    if (!api) return;
    try {
      const json = await invoke<string>("read_file", { path });
      const scene = await loadFromBlob(new Blob([json], { type: "application/json" }), null, null);
      const { viewBackgroundColor, gridSize, gridStep, gridModeEnabled } = scene.appState;
      api.addFiles(Object.values(scene.files));
      api.updateScene({
        elements: scene.elements,
        appState: { viewBackgroundColor, gridSize, gridStep, gridModeEnabled },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      api.history.clear();
      api.scrollToContent(undefined, { fitToContent: true, animate: false });
      this.markSaved(path);
    } catch (e) {
      await message(String(e), { title: "Could not open file", kind: "error" });
    }
  }

  private async writeTo(path: string) {
    const api = this.api;
    if (!api) return;
    try {
      const elements = api.getSceneElementsIncludingDeleted();
      const contents = serializeAsJSON(elements, api.getAppState(), api.getFiles(), "local");
      await invoke("write_file", { path, contents });
      this.markSaved(path);
    } catch (e) {
      await message(String(e), { title: "Could not save file", kind: "error" });
    }
  }

  private async confirmDiscard(): Promise<boolean> {
    if (!this.dirty) return true;
    return ask("You have unsaved changes. Discard them?", {
      title: "Unsaved changes",
      kind: "warning",
      okLabel: "Discard",
      cancelLabel: "Cancel",
    });
  }

  private markSaved(path: string) {
    this.path = path;
    this.dirty = false;
    this.savedVersion = hashElementsVersion(this.api?.getSceneElementsIncludingDeleted() ?? []);
    this.updateTitle();
  }

  private markDirty() {
    if (this.dirty) return;
    this.dirty = true;
    this.updateTitle();
  }

  private updateTitle() {
    const name = this.path?.split(/[\\/]/).pop() ?? "Untitled";
    void getCurrentWindow().setTitle(`${this.dirty ? "• " : ""}${name} — simple-whiteboard`);
  }
}
