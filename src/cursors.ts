// WebKitGTK scales CSS `url()` cursors by the display scale but not their hotspot, so
// Excalidraw's image cursors (eraser, laser) come out large, blurry and offset from where the
// pointer actually acts. On Linux we swap them for a native crosshair.
const USE_NATIVE_CURSORS = /Linux/.test(navigator.userAgent)

/** Replaces image cursors on Excalidraw's interactive canvas; returns the cleanup function. */
export function nativeCursors(container: HTMLElement): () => void {
  if (!USE_NATIVE_CURSORS) return () => {}
  const observer = new MutationObserver((records) => {
    for (const { target } of records) {
      const el = target as HTMLElement
      if (el.style.cursor.includes('url(')) el.style.cursor = 'crosshair'
    }
  })
  // Watch the subtree: the canvas is created after mount and may be recreated.
  observer.observe(container, { subtree: true, attributes: true, attributeFilter: ['style'] })
  return () => observer.disconnect()
}
