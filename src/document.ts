import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ask, message, open, save } from '@tauri-apps/plugin-dialog'
import { Editor, parseTldrawJsonFile, serializeTldrawJson } from 'tldraw'

const FILTERS = [{ name: 'tldraw', extensions: ['tldr'] }]

/** Owns the link between the editor and a `.tldr` file on disk. */
export class DocumentController {
  private editor: Editor | null = null
  private path: string | null = null
  private dirty = false

  /** Call from `<Tldraw onMount>`; returns the cleanup function. */
  attach(editor: Editor): () => void {
    this.editor = editor
    let disposed = false
    const cleanups: (() => void)[] = []

    cleanups.push(
      editor.store.listen(() => this.markDirty(), { source: 'user', scope: 'document' })
    )

    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (!(await this.confirmDiscard())) event.preventDefault()
      })
      .then((unlisten) => (disposed ? unlisten() : cleanups.push(unlisten)))

    void invoke<string | null>('initial_file').then((path) => {
      if (path && !disposed) void this.load(path)
    })

    this.updateTitle()
    return () => {
      disposed = true
      cleanups.forEach((fn) => fn())
      this.editor = null
    }
  }

  async open() {
    if (!(await this.confirmDiscard())) return
    const path = await open({ filters: FILTERS, multiple: false, directory: false })
    if (path) await this.load(path)
  }

  async save() {
    if (!this.path) return this.saveAs()
    await this.writeTo(this.path)
  }

  async saveAs() {
    const path = await save({ filters: FILTERS, defaultPath: this.path ?? 'untitled.tldr' })
    if (path) await this.writeTo(path)
  }

  private async load(path: string) {
    const editor = this.editor
    if (!editor) return
    try {
      const json = await invoke<string>('read_file', { path })
      const result = parseTldrawJsonFile({ json, schema: editor.store.schema })
      if (!result.ok) throw new Error(`Not a valid tldraw file (${result.error.type})`)
      editor.loadSnapshot(result.value.getStoreSnapshot())
      editor.clearHistory()
      editor.zoomToFit({ animation: { duration: 0 } })
      this.markSaved(path)
    } catch (e) {
      await message(String(e), { title: 'Could not open file', kind: 'error' })
    }
  }

  private async writeTo(path: string) {
    const editor = this.editor
    if (!editor) return
    try {
      await invoke('write_file', { path, contents: await serializeTldrawJson(editor) })
      this.markSaved(path)
    } catch (e) {
      await message(String(e), { title: 'Could not save file', kind: 'error' })
    }
  }

  private async confirmDiscard(): Promise<boolean> {
    if (!this.dirty) return true
    return ask('You have unsaved changes. Discard them?', {
      title: 'Unsaved changes',
      kind: 'warning',
      okLabel: 'Discard',
      cancelLabel: 'Cancel',
    })
  }

  private markSaved(path: string) {
    this.path = path
    this.dirty = false
    this.updateTitle()
  }

  private markDirty() {
    if (this.dirty) return
    this.dirty = true
    this.updateTitle()
  }

  private updateTitle() {
    const name = this.path?.split(/[\\/]/).pop() ?? 'Untitled'
    void getCurrentWindow().setTitle(`${this.dirty ? '• ' : ''}${name} — simple-whiteboard`)
  }
}
