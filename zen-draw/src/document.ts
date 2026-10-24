import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, message, open, save } from "@tauri-apps/plugin-dialog";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const FILTERS = [{ name: "Excalidraw", extensions: ["excalidraw"] }];

/** Owns the link between the editor and an `.excalidraw` file on disk. */
export class DocumentController {
  private api: ExcalidrawImperativeAPI | null = null;
  private path: string | null = null;

  /** Call once the Excalidraw API is available; returns the cleanup function. */
  attach(api: ExcalidrawImperativeAPI): () => void {
    this.api = api;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    cleanups.push(api.onDirtyChange(() => this.updateTitle()));

    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (!(await this.confirmDiscard())) {
          event.preventDefault();
        }
      })
      .then((unlisten) => (disposed ? unlisten() : cleanups.push(unlisten)));

    void invoke<string | null>("initial_file").then((path) => {
      if (path && !disposed) {
        void this.load(path);
      }
    });

    this.updateTitle();
    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      this.api = null;
    };
  }

  async open() {
    if (!(await this.confirmDiscard())) {
      return;
    }
    const path = await open({
      filters: FILTERS,
      multiple: false,
      directory: false,
    });
    if (path) {
      await this.load(path);
    }
  }

  async save() {
    if (!this.path) {
      return this.saveAs();
    }
    await this.writeTo(this.path);
  }

  async saveAs() {
    const path = await save({
      filters: FILTERS,
      defaultPath: this.path ?? "untitled.excalidraw",
    });
    if (path) {
      await this.writeTo(path);
    }
  }

  private async load(path: string) {
    const api = this.api;
    if (!api) {
      return;
    }
    try {
      const json = await invoke<string>("read_file", { path });
      await api.scene.load(json);
      this.setPath(path);
    } catch (e) {
      await message(String(e), { title: "Could not open file", kind: "error" });
    }
  }

  private async writeTo(path: string) {
    const api = this.api;
    if (!api) {
      return;
    }
    const contents = api.scene.serialize();
    // saved as of the serialization: a change during the write keeps the
    // scene dirty
    api.scene.markSaved();
    try {
      await invoke("write_file", { path, contents });
      this.setPath(path);
    } catch (e) {
      api.scene.markDirty();
      await message(String(e), { title: "Could not save file", kind: "error" });
    }
  }

  private async confirmDiscard(): Promise<boolean> {
    if (!this.api?.scene.isDirty()) {
      return true;
    }
    return ask("You have unsaved changes. Discard them?", {
      title: "Unsaved changes",
      kind: "warning",
      okLabel: "Discard",
      cancelLabel: "Cancel",
    });
  }

  /** the scene is saved to (or loaded from) the path; `scene.load` and
   * `writeTo` mark the scene as saved */
  private setPath(path: string) {
    this.path = path;
    this.updateTitle();
  }

  private updateTitle() {
    const name = this.path?.split(/[\\/]/).pop() ?? "Untitled";
    void getCurrentWindow().setTitle(
      `${this.api?.scene.isDirty() ? "• " : ""}${name} — zen-draw`,
    );
  }
}
