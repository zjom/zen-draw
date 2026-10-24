import { t } from "../i18n";

import { AppRing, RING_MAX_ITEMS } from "./App.ring";
import { DotsHorizontalIcon } from "./icons";
import { isLegacyLayerUI } from "./zen/legacyLayerUI";

import type { CommandId } from "../keymap";
import type { ToolType } from "../types";
import type { RingSlice } from "./App.ring";

export const TOOL_RING_MAX_ITEMS = RING_MAX_ITEMS;

export const DEFAULT_TOOL_RING: ToolRingConfig = {
  items: [
    "tool.selection",
    "tool.rectangle",
    "tool.ellipse",
    "tool.diamond",
    "tool.arrow",
    "tool.line",
    "tool.freedraw",
    "tool.text",
  ],
  more: [
    "tool.eraser",
    "tool.hand",
    "tool.frame",
    "tool.image",
    "tool.laser",
    "tool.stickynote",
    "tool.lasso",
    "tool.bucketfill",
  ],
};

export type ToolRingConfig = {
  /** at most 8 command IDs */
  items: readonly CommandId[];
  /** at most 8 command IDs, shown in the sub-ring of the "more" slice */
  more?: readonly CommandId[];
};

/**
 * The tool ring: a ring of commands (see `AppRing`). A secondary-button
 * drag that does not start on the selection opens it. The `ui.toolRing`
 * command opens it from the keyboard.
 */
export class AppToolRing extends AppRing {
  private getConfig = (): ToolRingConfig => {
    const config = this.app.props.toolRing ?? DEFAULT_TOOL_RING;
    const valid = (ids: readonly CommandId[] | undefined) =>
      (ids ?? [])
        .filter((id) => {
          if (!this.app.commands.has(id)) {
            console.warn(`toolRing: unknown command "${id}"`);
            return false;
          }
          return true;
        })
        .slice(0, TOOL_RING_MAX_ITEMS);
    return { items: valid(config.items), more: valid(config.more) };
  };

  /** whether a secondary-button drag opens the ring (else it pans) */
  canOpen = () =>
    !isLegacyLayerUI() &&
    this.app.isInteractionEnabled() &&
    !this.app.state.viewModeEnabled &&
    !this.app.props.activeTool &&
    this.getConfig().items.length > 0;

  private getCommandSlice = (id: CommandId): RingSlice => {
    const label = this.app.commands.getLabel(id);
    return {
      id,
      label,
      icon: this.app.commands.getIcon(id) ?? label.charAt(0).toUpperCase(),
      run: ({ lock }) => this.run(id, lock),
    };
  };

  protected getMainSlices = (): RingSlice[] => {
    const { items, more } = this.getConfig();
    return [
      ...items.map(this.getCommandSlice),
      ...(more?.length
        ? [
            {
              id: "more",
              label: t("zen.more"),
              icon: DotsHorizontalIcon,
              subRing: () => more.map(this.getCommandSlice),
            },
          ]
        : []),
    ];
  };

  private run = (id: CommandId, lock: boolean) => {
    const toolType = id.startsWith("tool.")
      ? (id.slice("tool.".length) as ToolType)
      : null;
    if (toolType) {
      this.app.setActiveTool({
        type:
          toolType === "selection"
            ? this.app.state.preferredSelectionTool.type
            : toolType,
        ...(lock ? { locked: true } : {}),
      });
      return;
    }
    this.app.commands.execute(id, "toolRing");
  };
}
