import React from "react";

import { isShallowEqual } from "@excalidraw/common";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { TunnelsContext, useInitializeTunnels } from "../../context/tunnels";
import { UIAppStateContext } from "../../context/ui-appState";

import { ActiveConfirmDialog } from "../ActiveConfirmDialog";
import { CommandPalette } from "../CommandPalette/CommandPalette";
import { DefaultSidebar } from "../DefaultSidebar";
import ElementLinkDialog from "../ElementLinkDialog";
import { ErrorDialog } from "../ErrorDialog";
import { HelpDialog } from "../HelpDialog";
import { ImageExportDialog } from "../ImageExportDialog";
import { LoadingMessage } from "../LoadingMessage";
import { TTDDialog } from "../TTDDialog/TTDDialog";
import { Toast } from "../Toast";

import { ToolIndicator } from "./ToolIndicator";
import { ToolRing } from "./ToolRing";

import type { ActionManager } from "../../actions/manager";
import type {
  AppClassProperties,
  AppProps,
  AppState,
  BinaryFiles,
  UIAppState,
} from "../../types";

type ZenLayerUIProps = {
  actionManager: ActionManager;
  appState: UIAppState;
  files: BinaryFiles;
  setAppState: React.Component<any, AppState>["setState"];
  elements: readonly NonDeletedExcalidrawElement[];
  UIOptions: AppProps["UIOptions"];
  onExportImage: AppClassProperties["onExportImage"];
  app: AppClassProperties;
  generateLinkForSelection?: AppProps["generateLinkForSelection"];
  toolIndicator: boolean;
  children?: React.ReactNode;
};

/**
 * The UI above the canvas. Unlike `LayerUI`, it has no toolbar, menus,
 * footer or properties panel: a control shows only when the user asks for
 * it — the tool ring (secondary-button drag), the command palette, the
 * context menu (rendered by `App`) and the dialogs that these open.
 */
const ZenLayerUI = ({
  actionManager,
  appState,
  files,
  setAppState,
  elements,
  UIOptions,
  onExportImage,
  app,
  generateLinkForSelection,
  toolIndicator,
  children,
}: ZenLayerUIProps) => {
  const tunnels = useInitializeTunnels();
  const TunnelsJotaiProvider = tunnels.tunnelsJotai.Provider;

  return (
    <UIAppStateContext.Provider value={appState}>
      <TunnelsJotaiProvider>
        <TunnelsContext.Provider value={tunnels}>
          {children}
          <ToolRing app={app} appState={appState} />
          {toolIndicator && <ToolIndicator appState={appState} />}
          <CommandPalette />
          {appState.isLoading && <LoadingMessage delay={250} />}
          {appState.openDialog?.name === "ttd" && <TTDDialog __fallback />}
          {appState.openDialog?.name === "help" && (
            <HelpDialog onClose={() => setAppState({ openDialog: null })} />
          )}
          {appState.openDialog?.name === "imageExport" &&
            UIOptions.canvasActions.saveAsImage && (
              <ImageExportDialog
                elements={elements}
                appState={appState}
                files={files}
                actionManager={actionManager}
                onExportImage={onExportImage}
                onCloseRequest={() => setAppState({ openDialog: null })}
                name={app.getName()}
              />
            )}
          {appState.openDialog?.name === "elementLinkSelector" && (
            <ElementLinkDialog
              sourceElementId={appState.openDialog.sourceElementId}
              onClose={() => setAppState({ openDialog: null })}
              scene={app.scene}
              appState={appState}
              generateLinkForSelection={generateLinkForSelection}
            />
          )}
          <ActiveConfirmDialog />
          {appState.errorMessage && (
            <ErrorDialog onClose={() => setAppState({ errorMessage: null })}>
              {appState.errorMessage}
            </ErrorDialog>
          )}
          {appState.toast && (
            <div className="floating-status-stack">
              <Toast
                message={appState.toast.message}
                onClose={() => setAppState({ toast: null })}
                duration={appState.toast.duration}
                closable={appState.toast.closable}
              />
            </div>
          )}
          {/* the library; the command palette opens it */}
          <DefaultSidebar __fallback />
        </TunnelsContext.Provider>
      </TunnelsJotaiProvider>
    </UIAppStateContext.Provider>
  );
};

/** the UI does not depend on the viewport and the pointer */
const stripIrrelevantAppStateProps = (appState: AppState) => {
  const {
    cursorButton,
    scrollX,
    scrollY,
    zoom,
    shouldCacheIgnoreZoom,
    snapLines,
    originSnapOffset,
    suggestedBinding,
    frameToHighlight,
    elementsToHighlight,
    ...rest
  } = appState;
  return rest;
};

const areEqual = (prevProps: ZenLayerUIProps, nextProps: ZenLayerUIProps) => {
  if (prevProps.children !== nextProps.children) {
    return false;
  }
  const { appState: prevAppState, ...prev } = prevProps;
  const { appState: nextAppState, ...next } = nextProps;
  return (
    isShallowEqual(
      stripIrrelevantAppStateProps(prevAppState as AppState),
      stripIrrelevantAppStateProps(nextAppState as AppState),
      {
        selectedElementIds: isShallowEqual,
        selectedGroupIds: isShallowEqual,
      },
    ) && isShallowEqual(prev, next)
  );
};

export default React.memo(ZenLayerUI, areEqual);
