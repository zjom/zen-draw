import React from "react";

import { isFirefox } from "@excalidraw/common";

import { KEYS } from "@excalidraw/common";

import { actionToggleTheme } from "../actions";
import { probablySupportsClipboardBlob } from "../clipboard";
import { t } from "../i18n";
import { getShortcutKey } from "../shortcut";

import { useApp, useExcalidrawActionManager } from "./App";
import { Dialog } from "./Dialog";

import "./HelpDialog.scss";

import type { JSX } from "react";

import type { CommandId } from "../keymap";

const Section = (props: { title: string; children: React.ReactNode }) => (
  <>
    <h3>{props.title}</h3>
    <div className="HelpDialog__islands-container">{props.children}</div>
  </>
);

const ShortcutIsland = (props: {
  caption: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`HelpDialog__island ${props.className}`}>
    <h4 className="HelpDialog__island-title">{props.caption}</h4>
    <div className="HelpDialog__island-content">{props.children}</div>
  </div>
);

function* intersperse(as: JSX.Element[][], delim: string | null) {
  let first = true;
  for (const x of as) {
    if (!first) {
      yield delim;
    }
    first = false;
    yield x;
  }
}

const upperCaseSingleChars = (str: string) => {
  return str.replace(/\b[a-z]\b/, (c) => c.toUpperCase());
};

const Shortcut = ({
  label,
  shortcuts,
  isOr = true,
}: {
  label: string;
  shortcuts: string[];
  isOr?: boolean;
}) => {
  const splitShortcutKeys = shortcuts.map((shortcut) => {
    const keys = shortcut.endsWith("++")
      ? [...shortcut.slice(0, -2).split("+"), "+"]
      : shortcut.split("+");

    return keys.map((key) => (
      <ShortcutKey key={key}>{upperCaseSingleChars(key)}</ShortcutKey>
    ));
  });

  return (
    <div className="HelpDialog__shortcut">
      <div>{label}</div>
      <div className="HelpDialog__key-container">
        {[...intersperse(splitShortcutKeys, isOr ? t("helpDialog.or") : "")]}
      </div>
    </div>
  );
};

/** the key combinations of a command in the effective keymap; nothing if
 * the command has none */
const CommandShortcut = ({
  label,
  command,
}: {
  label: string;
  command: CommandId;
}) => {
  const app = useApp();
  const shortcuts = app.commands.getShortcuts(command);
  return shortcuts.length ? (
    <Shortcut label={label} shortcuts={shortcuts} isOr={true} />
  ) : null;
};

const ShortcutKey = (props: { children: React.ReactNode }) => (
  <kbd className="HelpDialog__key" {...props} />
);

export const HelpDialog = ({ onClose }: { onClose?: () => void }) => {
  const app = useApp();
  const actionManager = useExcalidrawActionManager();
  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      <Dialog
        onCloseRequest={handleClose}
        title={t("helpDialog.title")}
        className={"HelpDialog"}
      >
        <Section title={t("helpDialog.shortcuts")}>
          <ShortcutIsland
            className="HelpDialog__island--tools"
            caption={t("helpDialog.tools")}
          >
            <CommandShortcut label={t("toolBar.hand")} command="tool.hand" />
            <CommandShortcut
              label={t("toolBar.selection")}
              command="tool.selection"
            />
            <CommandShortcut
              label={t("toolBar.rectangle")}
              command="tool.rectangle"
            />
            <CommandShortcut
              label={t("toolBar.diamond")}
              command="tool.diamond"
            />
            <CommandShortcut
              label={t("toolBar.ellipse")}
              command="tool.ellipse"
            />
            <CommandShortcut label={t("toolBar.arrow")} command="tool.arrow" />
            <CommandShortcut label={t("toolBar.line")} command="tool.line" />
            <CommandShortcut
              label={t("toolBar.freedraw")}
              command="tool.freedraw"
            />
            <CommandShortcut label={t("toolBar.text")} command="tool.text" />
            <CommandShortcut
              label={t("toolBar.stickynote")}
              command="tool.stickynote"
            />
            <CommandShortcut label={t("toolBar.image")} command="tool.image" />
            <CommandShortcut
              label={t("toolBar.eraser")}
              command="tool.eraser"
            />
            <CommandShortcut label={t("toolBar.frame")} command="tool.frame" />
            <CommandShortcut label={t("toolBar.laser")} command="tool.laser" />
            <CommandShortcut
              label={t("toolBar.bucketfill")}
              command="tool.bucketfill"
            />
            <Shortcut
              label={t("labels.eyeDropper")}
              shortcuts={[KEYS.I, "Shift+S", "Shift+G"]}
            />
            <Shortcut
              label={t("helpDialog.editLineArrowPoints")}
              shortcuts={[getShortcutKey("CtrlOrCmd+Enter")]}
            />
            <Shortcut
              label={t("helpDialog.editText")}
              shortcuts={[getShortcutKey("Enter")]}
            />
            <Shortcut
              label={t("helpDialog.textNewLine")}
              shortcuts={[
                getShortcutKey("Enter"),
                getShortcutKey("Shift+Enter"),
              ]}
            />
            <Shortcut
              label={t("helpDialog.textFinish")}
              shortcuts={[
                getShortcutKey("Esc"),
                getShortcutKey("CtrlOrCmd+Enter"),
              ]}
            />
            <Shortcut
              label={t("helpDialog.curvedArrow")}
              shortcuts={[
                "A",
                t("helpDialog.click"),
                t("helpDialog.click"),
                t("helpDialog.click"),
              ]}
              isOr={false}
            />
            <Shortcut
              label={t("helpDialog.curvedLine")}
              shortcuts={[
                "L",
                t("helpDialog.click"),
                t("helpDialog.click"),
                t("helpDialog.click"),
              ]}
              isOr={false}
            />
            <Shortcut
              label={t("helpDialog.cropStart")}
              shortcuts={[t("helpDialog.doubleClick"), getShortcutKey("Enter")]}
              isOr={true}
            />
            <Shortcut
              label={t("helpDialog.cropFinish")}
              shortcuts={[getShortcutKey("Enter"), getShortcutKey("Escape")]}
              isOr={true}
            />
            <CommandShortcut label={t("toolBar.lock")} command="ui.toolLock" />
            <Shortcut
              label={t("helpDialog.preventBinding")}
              shortcuts={[getShortcutKey("CtrlOrCmd")]}
            />
            <CommandShortcut label={t("toolBar.link")} command="hyperlink" />
            <Shortcut
              label={t("toolBar.convertElementType")}
              shortcuts={["Tab", "Shift+Tab"]}
              isOr={true}
            />
          </ShortcutIsland>
          <ShortcutIsland
            className="HelpDialog__island--view"
            caption={t("helpDialog.view")}
          >
            <CommandShortcut label={t("buttons.zoomIn")} command="zoomIn" />
            <CommandShortcut label={t("buttons.zoomOut")} command="zoomOut" />
            <CommandShortcut
              label={t("buttons.resetZoom")}
              command="resetZoom"
            />
            <CommandShortcut
              label={t("helpDialog.zoomToFit")}
              command="zoomToFit"
            />
            <CommandShortcut
              label={t("helpDialog.zoomToSelection")}
              command="zoomToFitSelectionInViewport"
            />
            <Shortcut
              label={t("helpDialog.movePageUpDown")}
              shortcuts={["PgUp/PgDn"]}
            />
            <Shortcut
              label={t("helpDialog.movePageLeftRight")}
              shortcuts={["Shift+PgUp/PgDn"]}
            />
            <CommandShortcut
              label={t("buttons.objectsSnapMode")}
              command="objectsSnapMode"
            />
            <CommandShortcut
              label={t("labels.toggleGrid")}
              command="gridMode"
            />
            <CommandShortcut label={t("labels.viewMode")} command="viewMode" />
            {actionManager.isActionEnabled(actionToggleTheme) && (
              <CommandShortcut
                label={t("labels.toggleTheme")}
                command="toggleTheme"
              />
            )}
            <CommandShortcut label={t("stats.fullTitle")} command="stats" />
            <CommandShortcut label={t("search.title")} command="searchMenu" />
            <CommandShortcut
              label={t("commandPalette.title")}
              command="ui.commandPalette"
            />
          </ShortcutIsland>
          <ShortcutIsland
            className="HelpDialog__island--editor"
            caption={t("helpDialog.editor")}
          >
            <Shortcut
              label={t("helpDialog.createFlowchart")}
              shortcuts={[getShortcutKey(`CtrlOrCmd+Arrow Key`)]}
              isOr={true}
            />
            <Shortcut
              label={t("helpDialog.navigateFlowchart")}
              shortcuts={[getShortcutKey(`Alt+Arrow Key`)]}
              isOr={true}
            />
            <Shortcut
              label={t("labels.moveCanvas")}
              shortcuts={[
                getShortcutKey(`Space+${t("helpDialog.drag")}`),
                getShortcutKey(`Wheel+${t("helpDialog.drag")}`),
              ]}
              isOr={true}
            />
            <CommandShortcut
              label={t("buttons.clearReset")}
              command="clearCanvas"
            />
            <CommandShortcut
              label={t("labels.delete")}
              command="deleteSelectedElements"
            />
            <CommandShortcut label={t("labels.cut")} command="cut" />
            <CommandShortcut label={t("labels.copy")} command="copy" />
            <CommandShortcut label={t("labels.paste")} command="paste" />
            <Shortcut
              label={t("labels.pasteAsPlaintext")}
              shortcuts={[getShortcutKey("CtrlOrCmd+Shift+V")]}
            />
            <CommandShortcut
              label={t("labels.selectAll")}
              command="selectAll"
            />
            <Shortcut
              label={t("labels.multiSelect")}
              shortcuts={[getShortcutKey(`Shift+${t("helpDialog.click")}`)]}
            />
            <Shortcut
              label={t("helpDialog.deepSelect")}
              shortcuts={[getShortcutKey(`CtrlOrCmd+${t("helpDialog.click")}`)]}
            />
            <Shortcut
              label={t("helpDialog.deepBoxSelect")}
              shortcuts={[getShortcutKey(`CtrlOrCmd+${t("helpDialog.drag")}`)]}
            />
            {/* firefox supports clipboard API under a flag, so we'll
                show users what they can do in the error message */}
            {(probablySupportsClipboardBlob || isFirefox) && (
              <CommandShortcut
                label={t("labels.copyAsPng")}
                command="copyAsPng"
              />
            )}
            <CommandShortcut
              label={t("labels.copyStyles")}
              command="copyStyles"
            />
            <CommandShortcut
              label={t("labels.pasteStyles")}
              command="pasteStyles"
            />
            <CommandShortcut
              label={t("labels.sendToBack")}
              command="sendToBack"
            />
            <CommandShortcut
              label={t("labels.bringToFront")}
              command="bringToFront"
            />
            <CommandShortcut
              label={t("labels.sendBackward")}
              command="sendBackward"
            />
            <CommandShortcut
              label={t("labels.bringForward")}
              command="bringForward"
            />
            <CommandShortcut label={t("labels.alignTop")} command="alignTop" />
            <CommandShortcut
              label={t("labels.alignBottom")}
              command="alignBottom"
            />
            <CommandShortcut
              label={t("labels.alignLeft")}
              command="alignLeft"
            />
            <CommandShortcut
              label={t("labels.alignRight")}
              command="alignRight"
            />
            <Shortcut
              label={t("labels.duplicateSelection")}
              shortcuts={[
                ...app.commands.getShortcuts("duplicateSelection"),
                getShortcutKey(`Alt+${t("helpDialog.drag")}`),
              ]}
              isOr={true}
            />
            <CommandShortcut
              label={t("helpDialog.toggleElementLock")}
              command="toggleElementLock"
            />
            <CommandShortcut label={t("buttons.undo")} command="undo" />
            <CommandShortcut label={t("buttons.redo")} command="redo" />
            <CommandShortcut label={t("labels.group")} command="group" />
            <CommandShortcut label={t("labels.ungroup")} command="ungroup" />
            <CommandShortcut
              label={t("labels.toggleWrap")}
              command="toggleWrap"
            />
            <CommandShortcut
              label={t("labels.flipHorizontal")}
              command="flipHorizontal"
            />
            <CommandShortcut
              label={t("labels.flipVertical")}
              command="flipVertical"
            />
            <Shortcut
              label={t("labels.showStroke")}
              shortcuts={[getShortcutKey("S")]}
            />
            <Shortcut
              label={t("labels.showBackground")}
              shortcuts={[getShortcutKey("G")]}
            />
            <Shortcut
              label={t("labels.showFonts")}
              shortcuts={[getShortcutKey("Shift+F")]}
            />
            <CommandShortcut
              label={t("labels.decreaseFontSize")}
              command="decreaseFontSize"
            />
            <CommandShortcut
              label={t("labels.increaseFontSize")}
              command="increaseFontSize"
            />
          </ShortcutIsland>
        </Section>
      </Dialog>
    </>
  );
};
