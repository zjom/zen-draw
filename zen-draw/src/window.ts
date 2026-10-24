import { getCurrentWindow } from "@tauri-apps/api/window";

/** Shows the main window, which starts hidden. Safe to call more than once. */
export const showWindow = () => getCurrentWindow().show();
