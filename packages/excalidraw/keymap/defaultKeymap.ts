import { isDarwin } from "@excalidraw/common";

import type { CommandId, KeyCombination } from "./types";

/**
 * The key combinations that zenboard uses when the host does not override a
 * command. Fixed keys (arrow keys, Escape, Enter, Tab, Space for the pan,
 * Alt and Shift during a drag) and the native clipboard keys are not here.
 */
export const getDefaultKeymap = (
  isMac: boolean = isDarwin,
): Partial<Record<CommandId, readonly KeyCombination[]>> => ({
  // tools ---------------------------------------------------------------------
  "tool.hand": ["h"],
  "tool.selection": ["v", "1"],
  "tool.rectangle": ["r", "2"],
  "tool.diamond": ["d", "3"],
  "tool.ellipse": ["o", "4"],
  "tool.arrow": ["a", "5"],
  "tool.line": ["l", "6"],
  "tool.freedraw": ["p", "x", "7"],
  "tool.text": ["t", "8"],
  "tool.stickynote": ["n"],
  "tool.image": ["9"],
  "tool.eraser": ["e", "0"],
  "tool.frame": ["f"],
  "tool.autoshape": ["shift+x"],
  "tool.laser": ["k"],
  "tool.bucketfill": ["b"],

  // ui ------------------------------------------------------------------------
  "ui.commandPalette": ["mod+/", "mod+shift+p", "mod+p"],
  "ui.imageExport": ["mod+shift+e"],
  "ui.toolLock": ["q"],

  // history -------------------------------------------------------------------
  undo: ["mod+z"],
  redo: ["mod+shift+z", "mod+y"],

  // clipboard & styles --------------------------------------------------------
  cut: ["mod+x"],
  copyAsPng: ["alt+shift+c"],
  copyStyles: ["mod+alt+c"],
  pasteStyles: ["mod+alt+v"],

  // elements ------------------------------------------------------------------
  selectAll: ["mod+a"],
  deleteSelectedElements: ["delete", "backspace"],
  duplicateSelection: ["mod+d"],
  group: ["mod+g"],
  ungroup: ["mod+shift+g"],
  hyperlink: ["mod+k"],
  toggleElementLock: ["mod+shift+l"],
  toggleWrap: ["w"],
  flipHorizontal: ["shift+h"],
  flipVertical: ["shift+v"],
  sendBackward: ["mod+["],
  bringForward: ["mod+]"],
  sendToBack: [isMac ? "mod+alt+[" : "mod+shift+["],
  bringToFront: [isMac ? "mod+alt+]" : "mod+shift+]"],
  alignTop: ["mod+shift+arrowup"],
  alignBottom: ["mod+shift+arrowdown"],
  alignLeft: ["mod+shift+arrowleft"],
  alignRight: ["mod+shift+arrowright"],
  distributeHorizontally: ["alt+h"],
  distributeVertically: ["alt+v"],
  decreaseFontSize: ["mod+shift+<", "mod+shift+comma"],
  increaseFontSize: ["mod+shift+>", "mod+shift+."],

  // canvas --------------------------------------------------------------------
  clearCanvas: ["mod+delete", "mod+backspace"],
  zoomIn: ["mod+plus", "mod+=", "shift+="],
  zoomOut: ["mod+minus", "shift+minus"],
  resetZoom: ["mod+0", "shift+0"],
  zoomToFit: ["shift+1"],
  // NOTE upstream: shift+2 should have been zoomToFitSelection (as in Figma)
  zoomToFitSelectionInViewport: ["shift+2"],
  zoomToFitSelection: ["shift+3"],
  searchMenu: ["mod+f"],

  // editor --------------------------------------------------------------------
  toggleTheme: ["alt+shift+d"],
  toggleShortcuts: ["?"],
  gridMode: ["mod+'"],
  objectsSnapMode: ["alt+s"],
  stats: ["alt+/"],
  viewMode: ["alt+r"],
});

/** key combinations that the browser handles (clipboard events), so they
 * are not in the keymap and cannot change; only the labels use them */
export const NATIVE_KEYS: Partial<
  Record<CommandId, readonly KeyCombination[]>
> = {
  copy: ["mod+c"],
  paste: ["mod+v"],
};
