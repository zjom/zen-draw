import { Emitter } from "@excalidraw/common";

import {
  CaptureUpdateAction,
  getNonDeletedElements,
} from "@excalidraw/element";

import type { DurableIncrement } from "@excalidraw/element";

import { cleanAppStateForExport } from "../appState";
import { loadFromBlob } from "../data/blob";
import { serializeAsJSON } from "../data/json";
import { restoreAppState, restoreElements } from "../data/restore";

import type { RestoredAppState } from "../data/restore";
import type { ImportedDataState } from "../data/types";
import type { AppState, BinaryFiles, UnsubscribeCallback } from "../types";
import type App from "./App";

export type SceneLoadOptions = {
  /** fits the viewport to the elements. Default: true */
  fitToContent?: boolean;
  /** clears the undo history. Default: true */
  resetHistory?: boolean;
};

/**
 * The document of the editor, for a host that keeps the document in a file:
 * load, serialize, and the dirty state.
 *
 * The scene is dirty if the store records a durable increment that changes
 * the elements or the background color after the last `markSaved`, or if
 * the grid changes. An undo to the saved state does not make the scene
 * clean.
 */
type Grid = Pick<AppState, "gridSize" | "gridStep" | "gridModeEnabled">;

const isSameGrid = (a: Grid, b: Grid) =>
  a.gridSize === b.gridSize &&
  a.gridStep === b.gridStep &&
  a.gridModeEnabled === b.gridModeEnabled;

export class AppDocument {
  private dirty = false;
  /** the grid at the last `markSaved` or `load` */
  private savedGrid: Grid | null = null;
  readonly onDirtyChange = new Emitter<[dirty: boolean]>();

  constructor(
    private app: App,
    private dependencies: {
      /** clears the undo history (private to App) */
      resetHistory: () => void;
    },
  ) {}

  isDirty = () => this.dirty;

  private setDirty = (dirty: boolean) => {
    if (this.dirty !== dirty) {
      this.dirty = dirty;
      this.onDirtyChange.trigger(dirty);
    }
  };

  markSaved = () => {
    this.savedGrid = null;
    this.setDirty(false);
  };

  /** e.g. the host marked the scene as saved before a write that failed */
  markDirty = () => {
    this.setDirty(true);
  };

  /** subscribes `callback` to the changes of the dirty state */
  subscribe = (callback: (dirty: boolean) => void): UnsubscribeCallback =>
    this.onDirtyChange.on(callback);

  /** called for each durable increment of the store */
  onDurableIncrement = (increment: DurableIncrement) => {
    const { elements, appState } = increment.delta;
    if (
      !elements.isEmpty() ||
      "viewBackgroundColor" in appState.delta.inserted ||
      "viewBackgroundColor" in appState.delta.deleted
    ) {
      this.setDirty(true);
    }
  };

  /** called from `App.componentDidUpdate`: the store does not observe the
   * grid */
  onStateUpdate = (prevState: AppState) => {
    const { state } = this.app;
    if (
      state.isLoading ||
      prevState.isLoading ||
      isSameGrid(state, prevState) ||
      // the update of a `load`
      (this.savedGrid && isSameGrid(state, this.savedGrid))
    ) {
      return;
    }
    this.setDirty(true);
  };

  private parse = async (
    data: string | Blob | ImportedDataState,
  ): Promise<{
    elements: ImportedDataState["elements"];
    appState: RestoredAppState;
    files: BinaryFiles;
  }> => {
    if (typeof data === "string" || data instanceof Blob) {
      const blob =
        typeof data === "string"
          ? new Blob([data], { type: "application/json" })
          : data;
      return loadFromBlob(blob, null, null);
    }
    return {
      elements: restoreElements(data.elements, null, {
        repairBindings: true,
        deleteInvisibleElements: true,
      }),
      appState: restoreAppState(
        cleanAppStateForExport((data.appState ?? {}) as Partial<AppState>),
        null,
      ),
      files: data.files ?? {},
    };
  };

  /**
   * Replaces the scene with the data: the contents of an `.excalidraw` file
   * (a string or a Blob, also a PNG or SVG with an embedded scene) or the
   * data of a scene. Keeps only the fields of `AppState` that belong to the
   * document. Adds the files, resets the history and marks the scene as
   * saved.
   */
  load = async (
    data: string | Blob | ImportedDataState,
    opts: SceneLoadOptions = {},
  ) => {
    const { fitToContent = true, resetHistory = true } = opts;
    const { app } = this;
    const scene = await this.parse(data);
    // the fields of `AppState` that belong to the document
    const { viewBackgroundColor, gridSize, gridStep, gridModeEnabled } =
      scene.appState;

    app.closeRings();
    app.addFiles(Object.values(scene.files));
    app.updateScene({
      elements: scene.elements,
      appState: {
        viewBackgroundColor,
        gridSize,
        gridStep,
        gridModeEnabled,
        selectedElementIds: {},
        selectedGroupIds: {},
        editingGroupId: null,
        openPopup: null,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    if (resetHistory) {
      this.dependencies.resetHistory();
    }

    const elements = app.scene.getNonDeletedElements();
    if (fitToContent && elements.length) {
      app.viewport.setViewport({
        target: elements,
        fit: "scale-down",
        animation: false,
      });
    }

    this.markSaved();
    // the grid of the scene does not make the scene dirty when the update
    // commits
    this.savedGrid = { gridSize, gridStep, gridModeEnabled };
  };

  /** the contents of an `.excalidraw` file of the scene */
  serialize = () =>
    serializeAsJSON(
      getNonDeletedElements(this.app.scene.getElementsIncludingDeleted()),
      this.app.state,
      this.app.files,
      "local",
    );
}
