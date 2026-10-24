import { ARROW_TYPE, isWritableElement, oneOf } from "@excalidraw/common";

import { trackEvent } from "../analytics";
import { t } from "../i18n";
import {
  formatKeyCombination,
  getDefaultKeymap,
  matchKeyCombination,
  NATIVE_KEYS,
  parseKeyCombination,
  resolveKeymap,
} from "../keymap";

import { activeConfirmDialogAtom } from "./ActiveConfirmDialog";
import { TOOLS } from "./Tools";

import type { Action, ActionName } from "../actions/types";
import type { TranslationKeys } from "../i18n";
import type {
  CommandId,
  HostCommand,
  HostCommandId,
  KeyCombination,
  Keymap,
  KeymapConflict,
  ParsedKeyCombination,
  ToolCommandId,
  UICommandId,
} from "../keymap";
import type { ToolbarToolType } from "./Tools";
import type App from "./App";

export type CommandSource = "keyboard" | "commandPalette" | "toolRing" | "api";

type BuiltinCommand = {
  label: () => string;
  /** the context test for a key combination: the key combination runs the
   * command only if the test passes */
  keyCondition?: () => boolean;
  run: (
    source: CommandSource,
    event?: KeyboardEvent | React.KeyboardEvent,
  ) => void;
  /** press command: called on keydown instead of `run` */
  onPress?: () => void;
  /** press command: called on keyup, and on window blur */
  onRelease?: () => void;
};

const TOOL_COMMAND_PREFIX = "tool.";
const HOST_COMMAND_PREFIX = "host.";

const isHostCommandId = (id: string): id is HostCommandId =>
  id.startsWith(HOST_COMMAND_PREFIX);

/**
 * The commands of the editor and of the host, the effective keymap, and the
 * dispatch of key combinations to commands.
 *
 * A command is a tool (`tool.*`), an action (its `ActionName`), an editor UI
 * operation (`ui.*`) or a host command (`host.*`, from `props.commands`).
 * The effective keymap is the default keymap after the overrides of
 * `props.keymap`.
 */
export class AppCommands {
  private keymap: Record<CommandId, KeyCombination[]> = {} as Record<
    CommandId,
    KeyCombination[]
  >;
  private keymapConflicts: KeymapConflict[] = [];
  private parsedKeymap: { id: CommandId; parsed: ParsedKeyCombination }[] = [];
  /** the inputs of the last resolve, to skip a resolve with equal inputs */
  private keymapInputs: {
    overrides: unknown;
    hostCommands: unknown;
    signature: string;
  } | null = null;
  /** press commands whose key is down, by `event.code` */
  private pressed = new Map<string, CommandId>();

  private readonly uiCommands: Record<UICommandId, BuiltinCommand> = {
    "ui.commandPalette": {
      label: () => t("commandPalette.title"),
      run: () => {
        this.app.setState((state) => ({
          openDialog:
            state.openDialog?.name === "commandPalette"
              ? null
              : { name: "commandPalette" },
        }));
      },
    },
    "ui.toolRing": {
      label: () => t("zen.toolRing"),
      keyCondition: () => this.app.toolRing.canOpen(),
      // from the command palette or the API: a sticky ring at the pointer
      run: () => {
        this.app.toolRing.openAtPointer({ sticky: true });
      },
      onPress: () => {
        this.app.toolRing.openAtPointer();
      },
      onRelease: () => {
        this.app.toolRing.release({ keepOpenInDeadZone: true });
      },
    },
    "ui.imageExport": {
      label: () => t("buttons.exportImage"),
      run: () => {
        this.app.setState({ openDialog: { name: "imageExport" } });
      },
    },
    "ui.toolLock": {
      label: () => t("toolBar.lock"),
      keyCondition: () =>
        this.canSwitchToolFromKeyboard() && !this.app.state.viewModeEnabled,
      run: (source) => {
        this.app.toggleLock(source === "keyboard" ? "keyboard" : "ui");
      },
    },
  };

  /** actions whose command does something else than `action.perform` */
  private readonly actionCommandOverrides: Partial<
    Record<ActionName, BuiltinCommand["run"]>
  > = {
    // asks for a confirmation first, as the command palette does
    clearCanvas: () => {
      this.app.updateEditorAtom(activeConfirmDialogAtom, "clearCanvas");
    },
  };

  constructor(private app: App) {}

  // ---------------------------------------------------------------------------
  // registry
  // ---------------------------------------------------------------------------

  private getHostCommands = (): Partial<Record<HostCommandId, HostCommand>> =>
    this.app.props.commands ?? {};

  private getAction = (id: string): Action | undefined =>
    this.app.actionManager.actions[id as ActionName];

  private getToolType = (id: string): ToolbarToolType | null => {
    if (!id.startsWith(TOOL_COMMAND_PREFIX)) {
      return null;
    }
    const type = id.slice(TOOL_COMMAND_PREFIX.length);
    return type in TOOLS ? (type as ToolbarToolType) : null;
  };

  private getBuiltinCommand = (id: string): BuiltinCommand | null => {
    const toolType = this.getToolType(id);
    if (toolType) {
      return {
        label: () => t(`toolBar.${toolType}` as TranslationKeys),
        keyCondition: () => this.isToolKeyConditionMet(toolType),
        run: (source, event) => this.activateTool(toolType, source, event),
      };
    }
    if (id in this.uiCommands) {
      return this.uiCommands[id as UICommandId];
    }
    const action = this.getAction(id);
    if (action) {
      const override = this.actionCommandOverrides[action.name];
      return {
        label: () => this.getActionLabel(action),
        keyCondition: () => this.app.actionManager.isKeyboardEnabled(action),
        run: (source, event) => {
          if (override) {
            override(source, event);
          } else if (source === "keyboard" && event) {
            this.app.actionManager.runFromKeyboard(action, event);
          } else {
            this.app.actionManager.executeAction(action, source);
          }
        },
      };
    }
    return null;
  };

  private getActionLabel = (action: Action) => {
    const label =
      typeof action.label === "function"
        ? action.label(
            this.app.scene.getNonDeletedElements(),
            this.app.state,
            this.app,
          )
        : action.label;
    // some labels are not translation keys
    return t(label as TranslationKeys, null, label) || action.name;
  };

  /** the IDs of all commands */
  getIds = (): CommandId[] => [
    ...(Object.keys(TOOLS) as ToolbarToolType[]).map(
      (type): ToolCommandId => `tool.${type}`,
    ),
    ...(Object.keys(this.uiCommands) as UICommandId[]),
    ...(Object.keys(this.app.actionManager.actions) as ActionName[]),
    ...(Object.keys(this.getHostCommands()) as HostCommandId[]),
  ];

  has = (id: string): id is CommandId =>
    isHostCommandId(id)
      ? id in this.getHostCommands()
      : this.getBuiltinCommand(id) !== null;

  getLabel = (id: CommandId): string => {
    if (isHostCommandId(id)) {
      return this.getHostCommands()[id]?.label ?? id;
    }
    return this.getBuiltinCommand(id)?.label() ?? id;
  };

  /** the icon of a tool or an action, if it has one */
  getIcon = (id: CommandId): React.ReactNode => {
    const toolType = this.getToolType(id);
    if (toolType) {
      return TOOLS[toolType].icon;
    }
    const action = this.getAction(id);
    return typeof action?.icon === "function"
      ? action.icon(this.app.state, this.app.scene.getNonDeletedElements())
      : action?.icon ?? null;
  };

  list = () =>
    this.getIds().map((id) => ({
      id,
      label: this.getLabel(id),
      keys: this.getKeys(id),
    }));

  /**
   * Runs a command. Returns false if the command does not exist, or if it is
   * a press command (press commands run only from their key combinations).
   */
  execute = (id: CommandId, source: CommandSource = "api"): boolean => {
    if (isHostCommandId(id)) {
      const command = this.getHostCommands()[id];
      if (!command?.run) {
        return false;
      }
      command.run();
      return true;
    }
    const command = this.getBuiltinCommand(id);
    if (!command) {
      return false;
    }
    command.run(source);
    return true;
  };

  // ---------------------------------------------------------------------------
  // keymap
  // ---------------------------------------------------------------------------

  /** resolves the effective keymap again if `props.keymap` or the key
   * combinations of `props.commands` changed. Cheap if the props did not
   * change: App calls it on each render. */
  syncKeymap = (force = false) => {
    const overrides = this.app.props.keymap;
    const hostCommands = this.app.props.commands;
    if (
      !force &&
      this.keymapInputs &&
      this.keymapInputs.overrides === overrides &&
      this.keymapInputs.hostCommands === hostCommands
    ) {
      return;
    }
    const signature = JSON.stringify([
      overrides ?? null,
      Object.entries(hostCommands ?? {}).map(([id, command]) => [
        id,
        command?.keys,
      ]),
    ]);
    const unchanged = signature === this.keymapInputs?.signature;
    this.keymapInputs = { overrides, hostCommands, signature };
    if (!force && unchanged) {
      return;
    }

    const { keymap, conflicts, warnings } = resolveKeymap({
      defaults: getDefaultKeymap(),
      hostCommands: this.getHostCommands(),
      overrides,
      isKnownCommand: this.has,
    });
    warnings.forEach((warning) => console.warn(warning));

    this.keymap = keymap;
    this.keymapConflicts = conflicts;
    this.parsedKeymap = [];
    for (const [id, keys] of Object.entries(keymap)) {
      for (const key of keys) {
        const parsed = parseKeyCombination(key);
        if (parsed) {
          this.parsedKeymap.push({ id: id as CommandId, parsed });
        }
      }
    }
  };

  /** the effective keymap, with an entry for each command */
  getKeymap = (): Keymap => {
    const keymap = {} as Record<CommandId, readonly KeyCombination[]>;
    for (const id of this.getIds()) {
      keymap[id] = this.getKeys(id);
    }
    return keymap;
  };

  getConflicts = (): KeymapConflict[] =>
    this.keymapConflicts.map((conflict) => ({
      ...conflict,
      ids: [...conflict.ids],
    }));

  getKeys = (id: CommandId): KeyCombination[] => [...(this.keymap[id] ?? [])];

  /**
   * The label of a key combination of the command, e.g. `Ctrl+Shift+S`, or an
   * empty string if the command has no key combination.
   */
  getShortcut = (id: CommandId, index = 0): string => {
    const keys = this.keymap[id]?.length ? this.keymap[id] : NATIVE_KEYS[id];
    if (!keys?.length) {
      return "";
    }
    return formatKeyCombination(keys[index] ?? keys[0]);
  };

  /** the labels of all key combinations of the command */
  getShortcuts = (id: CommandId): string[] =>
    (this.keymap[id]?.length ? this.keymap[id] : NATIVE_KEYS[id] ?? []).map(
      (keys) => formatKeyCombination(keys),
    );

  /** whether the event matches a key combination of the command */
  matches = (
    id: CommandId,
    event: KeyboardEvent | React.KeyboardEvent,
  ): boolean =>
    this.parsedKeymap.some(
      (entry) => entry.id === id && matchKeyCombination(entry.parsed, event),
    );

  /**
   * The commands of the event whose key condition passes. A match on
   * `event.key` wins over a match on `event.code`.
   */
  private findCommands = (
    event: KeyboardEvent | React.KeyboardEvent,
  ): CommandId[] => {
    let best = 0;
    let ids: CommandId[] = [];
    for (const { id, parsed } of this.parsedKeymap) {
      const result = matchKeyCombination(parsed, event);
      if (!result || result < best || ids.includes(id)) {
        continue;
      }
      if (!this.isKeyConditionMet(id)) {
        continue;
      }
      if (result > best) {
        best = result;
        ids = [];
      }
      ids.push(id);
    }
    return ids;
  };

  /** the host command of the event, if exactly one matches */
  findHostCommand = (
    event: KeyboardEvent | React.KeyboardEvent,
  ): HostCommandId | null => {
    const ids = this.findCommands(event);
    return ids.length === 1 && isHostCommandId(ids[0]) ? ids[0] : null;
  };

  private isKeyConditionMet = (id: CommandId) => {
    if (isHostCommandId(id)) {
      return id in this.getHostCommands();
    }
    const command = this.getBuiltinCommand(id);
    return !!command && (!command.keyCondition || command.keyCondition());
  };

  // ---------------------------------------------------------------------------
  // dispatch
  // ---------------------------------------------------------------------------

  /** runs the command of a key combination. Returns true if the event is
   * handled. */
  handleKeyDown = (event: KeyboardEvent | React.KeyboardEvent): boolean => {
    if (isWritableElement(event.target)) {
      return false;
    }

    const ids = this.findCommands(event);
    if (ids.length !== 1) {
      if (ids.length > 1) {
        console.warn(
          "Canceling as multiple commands match this key combination",
          ids,
        );
      }
      return false;
    }
    const [id] = ids;

    const command = isHostCommandId(id)
      ? this.getHostCommands()[id]!
      : this.getBuiltinCommand(id)!;
    if (command.onPress || command.onRelease) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat && !this.pressed.has(event.code)) {
        this.pressed.set(event.code, id);
        command.onPress?.();
      }
      return true;
    }

    if (isHostCommandId(id)) {
      event.preventDefault();
      event.stopPropagation();
      this.getHostCommands()[id]!.run?.();
      return true;
    }

    this.getBuiltinCommand(id)!.run("keyboard", event);
    // actions stop the event themselves (an action blocked by a viewport
    // transition still consumes it)
    if (!this.getAction(id)) {
      event.stopPropagation();
      event.preventDefault();
    }
    return true;
  };

  /** releases the press command of the key */
  handleKeyUp = (event: KeyboardEvent): boolean => {
    const id = this.pressed.get(event.code);
    if (!id) {
      return false;
    }
    this.pressed.delete(event.code);
    this.release(id);
    return true;
  };

  /** releases all press commands, e.g. when the window loses focus */
  releaseAll = () => {
    const ids = [...this.pressed.values()];
    this.pressed.clear();
    for (const id of ids) {
      this.release(id);
    }
  };

  private release = (id: CommandId) => {
    const command = isHostCommandId(id)
      ? this.getHostCommands()[id]
      : this.getBuiltinCommand(id);
    command?.onRelease?.();
  };

  // ---------------------------------------------------------------------------
  // tools
  // ---------------------------------------------------------------------------

  private canSwitchToolFromKeyboard = () =>
    this.app.isInteractionEnabled() &&
    // view mode hardcoded from upstream -> disable tool switching for now
    this.app.props.viewModeEnabled !== true &&
    !this.app.state.newElement &&
    !this.app.state.selectionElement &&
    !this.app.state.selectedElementsAreBeingDragged;

  private resolveToolType = (type: ToolbarToolType) =>
    // the selection command activates whichever selection tool the user
    // prefers (selection or lasso)
    type === "selection" ? this.app.state.preferredSelectionTool.type : type;

  private isToolKeyConditionMet = (type: ToolbarToolType) =>
    this.canSwitchToolFromKeyboard() &&
    (!this.app.state.viewModeEnabled ||
      oneOf(this.resolveToolType(type), ["laser", "hand"]));

  private activateTool = (
    type: ToolbarToolType,
    source: CommandSource,
    event?: KeyboardEvent | React.KeyboardEvent,
  ) => {
    const app = this.app;
    const shape = this.resolveToolType(type);

    if (source === "keyboard" && app.state.activeTool.type !== shape) {
      trackEvent(
        "toolbar",
        shape,
        `keyboard (${
          app.editorInterface.formFactor === "phone" ? "mobile" : "desktop"
        })`,
      );
    }
    if (shape === "arrow" && app.state.activeTool.type === "arrow") {
      const nextArrowType =
        app.state.currentItemArrowType === ARROW_TYPE.sharp
          ? ARROW_TYPE.round
          : app.state.currentItemArrowType === ARROW_TYPE.round
          ? ARROW_TYPE.elbow
          : ARROW_TYPE.sharp;
      app.setState({ currentItemArrowType: nextArrowType });
      app.cursorHints.onArrowTypeCycled(nextArrowType);
    } else if (event && (shape === "arrow" || shape === "line")) {
      app.cursorHints.onToolShortcut(
        shape,
        /^\d$/.test(event.key) || /^(Digit|Numpad)\d$/.test(event.code)
          ? "digit"
          : "letter",
      );
    }

    if (shape === "bucketfill" && app.state.activeTool.type === "bucketfill") {
      app.bucketFill.cycleBackgroundColor();
    } else if (shape === "lasso" && app.state.activeTool.type === "laser") {
      app.setActiveTool({ type: app.state.preferredSelectionTool.type });
    } else {
      app.setActiveTool({ type: shape }, { toggle: true });
    }
  };
}
