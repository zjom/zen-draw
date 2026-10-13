import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { useMemo } from 'react'
import {
  DefaultMainMenu,
  DefaultMainMenuContent,
  TLComponents,
  TLUiActionsContextType,
  TLUiOverrides,
  Tldraw,
  TldrawUiMenuActionItem,
  TldrawUiMenuGroup,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { AppConfig, expandKbd } from './config'
import { syncNativeCursor } from './cursors'
import { DocumentController } from './document'

// Bundle fonts/icons/translations instead of fetching them from tldraw's CDN.
const assetUrls = getAssetUrlsByImport()

const components: TLComponents = {
  MainMenu: () => (
    <DefaultMainMenu>
      <TldrawUiMenuGroup id="file">
        <TldrawUiMenuActionItem actionId="app.open" />
        <TldrawUiMenuActionItem actionId="app.save" />
        <TldrawUiMenuActionItem actionId="app.save-as" />
      </TldrawUiMenuGroup>
      <DefaultMainMenuContent />
    </DefaultMainMenu>
  ),
}

const warned = new Set<string>()

function rebind(
  items: Record<string, { kbd?: string }>,
  bindings: Record<string, string>,
  kind: string
) {
  for (const [id, kbd] of Object.entries(bindings)) {
    const item = items[id]
    if (!item) {
      const msg = `config: unknown ${kind} id "${id}"`
      if (!warned.has(msg)) console.warn(msg)
      warned.add(msg)
      continue
    }
    item.kbd = expandKbd(kbd)
  }
}

function buildOverrides(config: AppConfig, doc: DocumentController): TLUiOverrides {
  return {
    actions(_editor, actions) {
      const appActions: TLUiActionsContextType = {
        'app.open': { id: 'app.open', label: 'app.open', kbd: 'cmd+o,ctrl+o', readonlyOk: true, onSelect: () => doc.open() },
        'app.save': { id: 'app.save', label: 'app.save', kbd: 'cmd+s,ctrl+s', readonlyOk: true, onSelect: () => doc.save() },
        'app.save-as': { id: 'app.save-as', label: 'app.save-as', kbd: 'cmd+shift+s,ctrl+shift+s', readonlyOk: true, onSelect: () => doc.saveAs() },
      }
      const all = { ...actions, ...appActions }
      rebind(all, config.keys.actions, 'action')
      return all
    },
    tools(_editor, tools) {
      rebind(tools, config.keys.tools, 'tool')
      return tools
    },
    translations: {
      en: { 'app.open': 'Open…', 'app.save': 'Save', 'app.save-as': 'Save as…' },
    },
  }
}

export function App({ config }: { config: AppConfig }) {
  const doc = useMemo(() => new DocumentController(), [])
  const overrides = useMemo(() => buildOverrides(config, doc), [config, doc])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw
        licenseKey={config.license_key ?? undefined}
        assetUrls={assetUrls}
        overrides={overrides}
        components={components}
        onMount={(editor) => {
          const detachDoc = doc.attach(editor)
          const stopCursor = syncNativeCursor(editor)
          return () => {
            detachDoc()
            stopCursor()
          }
        }}
      />
    </div>
  )
}
