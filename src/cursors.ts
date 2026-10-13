import { Editor, TLCursorType, react } from 'tldraw'
import './cursors.css'

// WebKitGTK scales CSS `url()` cursors by the display scale but not their hotspot, so tldraw's
// SVG cursors come out large, blurry and offset from where the pointer actually acts. On Linux
// we swap them for native cursors, which the compositor renders at the right size.
export const USE_NATIVE_CURSORS = /Linux/.test(navigator.userAgent)

if (USE_NATIVE_CURSORS) document.documentElement.classList.add('sw-native-cursors')

// Clockwise order: rotating a shape 45° clockwise turns an ew-resize handle into nwse-resize.
const RESIZE = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize']

function resize(base: string, rotation: number) {
  const steps = Math.round((rotation * 180) / Math.PI / 45)
  return RESIZE[(((RESIZE.indexOf(base) + steps) % 4) + 4) % 4]
}

function nativeCursor(type: TLCursorType, rotation: number): string {
  switch (type) {
    case 'cross':
    case 'comment':
      return 'crosshair'
    case 'resize-edge':
      return resize('ew-resize', rotation)
    case 'resize-corner':
      return resize('nesw-resize', rotation)
    case 'ew-resize':
    case 'ns-resize':
    case 'nesw-resize':
    case 'nwse-resize':
      return resize(type, rotation)
    case 'rotate':
    case 'nesw-rotate':
    case 'nwse-rotate':
    case 'swne-rotate':
    case 'senw-rotate':
      return 'pointer'
    default:
      return type
  }
}

/** Keeps `--sw-cursor` on the container in sync with tldraw's cursor state. */
export function syncNativeCursor(editor: Editor): () => void {
  if (!USE_NATIVE_CURSORS) return () => {}
  const container = editor.getContainer()
  return react('native cursor', () => {
    const { type, rotation } = editor.getInstanceState().cursor
    container.style.setProperty('--sw-cursor', nativeCursor(type, rotation))
  })
}
