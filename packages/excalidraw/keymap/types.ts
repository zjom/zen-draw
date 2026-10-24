import type { ActionName } from "../actions/types";
import type { ToolbarToolType } from "../components/Tools";

export type ToolCommandId = `tool.${ToolbarToolType}`;
export type UICommandId = `ui.${string}`;
export type HostCommandId = `host.${string}`;

/** identifies an operation that a key combination, a ring slice or the
 * command palette can start */
export type CommandId =
  | ToolCommandId
  | ActionName
  | UICommandId
  | HostCommandId;

/** one key and zero or more modifiers joined by `+`, e.g. `mod+shift+s`.
 * A string can hold more than one key combination, separated by commas. */
export type KeyCombination = string;

/** `null` removes all key combinations of the command */
export type KeymapOverrides = Partial<
  Record<CommandId, KeyCombination | readonly KeyCombination[] | null>
>;

export type Keymap = Readonly<Record<CommandId, readonly KeyCombination[]>>;

export type KeymapConflict = {
  keys: KeyCombination;
  /** the commands that keep the key combination come first */
  ids: CommandId[];
};

export type HostCommand = {
  label: string;
  /** the default key combinations; `keymap` overrides them */
  keys?: KeyCombination | readonly KeyCombination[];
  run?: () => void;
  /** press command: called on keydown */
  onPress?: () => void;
  /** press command: called on keyup, and on window blur */
  onRelease?: () => void;
};

export type HostCommands = Record<HostCommandId, HostCommand>;
