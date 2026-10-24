import clsx from "clsx";
import { useEffect, useState } from "react";

import { capitalizeString } from "@excalidraw/common";

import type { PointerType } from "@excalidraw/element/types";

import { trackEvent } from "../analytics";
import { t } from "../i18n";

import { IconButton } from "./IconButton";
import { ToolPopover } from "./ToolPopover";
import {
  SelectionIcon,
  RectangleIcon,
  DiamondIcon,
  EllipseIcon,
  ArrowIcon,
  LineIcon,
  FreedrawIcon,
  drawShapeToolIcon,
  TextIcon,
  ImageIcon,
  EraserIcon,
  laserPointerToolIcon,
  bucketFillIcon,
  LassoIcon,
  handIcon,
  frameToolIcon,
  EmbedIcon,
  stickyNoteToolIcon,
} from "./icons";

import type {
  AppClassProperties,
  AppState,
  ToolType,
  UIAppState,
} from "../types";

export type ToolConfig = {
  icon: React.ReactNode;
  /** whether the tool's shapes can be filled — fills the icon when active */
  fillable?: boolean;
  /**
   * re-activating the tool switches back to the previously active tool
   * (via the keyboard shortcut or ESC — see `setActiveTool`'s `toggle`
   * option)
   */
  toggle?: boolean;
};

/** preserves the exact keys while typing every entry as ToolConfig */
const defineTools = <T extends Record<string, ToolConfig>>(tools: T) =>
  tools as { [K in keyof T]: ToolConfig };

/**
 * Tool data — the single source of truth for tool buttons, the `tool.*`
 * commands (their key combinations are in the keymap, see
 * `keymap/defaultKeymap.ts`), and the command palette. Toolbar placement
 * is not defined here: toolbars compose the `*ToolButton` components below
 * manually, so entries without a toolbar slot (e.g. laser) are data-only.
 */
export const TOOLS = defineTools({
  hand: {
    icon: handIcon,
    toggle: true,
  },
  selection: {
    icon: SelectionIcon,
    fillable: true,
  },
  rectangle: {
    icon: RectangleIcon,
    fillable: true,
  },
  diamond: {
    icon: DiamondIcon,
    fillable: true,
  },
  ellipse: {
    icon: EllipseIcon,
    fillable: true,
  },
  arrow: {
    icon: ArrowIcon,
    fillable: true,
  },
  line: {
    icon: LineIcon,
    fillable: true,
  },
  freedraw: {
    icon: FreedrawIcon,
  },
  text: {
    icon: TextIcon,
  },
  stickynote: {
    icon: stickyNoteToolIcon,
  },
  image: {
    icon: ImageIcon,
  },
  eraser: {
    icon: EraserIcon,
    toggle: true,
  },
  frame: {
    icon: frameToolIcon,
  },
  autoshape: {
    icon: drawShapeToolIcon,
    fillable: false,
  },
  embeddable: {
    icon: EmbedIcon,
  },
  laser: {
    icon: laserPointerToolIcon,
  },
  bucketfill: {
    icon: bucketFillIcon,
  },
  lasso: {
    icon: LassoIcon,
    fillable: false,
  },
});

export type ToolbarToolType = keyof typeof TOOLS;

/**
 * tools that, when activated while already active, switch back to the
 * previously active tool (see `setActiveTool`'s `toggle` option)
 */
export const TOGGLE_TOOLS: readonly (ToolType | "custom")[] = (
  Object.keys(TOOLS) as ToolbarToolType[]
).filter((type) => TOOLS[type].toggle);

/** the label of the first key combination of the tool, e.g. "R" */
export const getToolLetter = (
  app: AppClassProperties,
  type: ToolbarToolType,
): string | undefined => app.commands.getShortcut(`tool.${type}`) || undefined;

/** human-readable shortcut hint, e.g. "R or 2", used in tooltips & aria */
export const getToolShortcut = (
  app: AppClassProperties,
  type: ToolbarToolType,
) => app.commands.getShortcuts(`tool.${type}`).join(` ${t("helpDialog.or")} `);

/**
 * Whether a toolbar entry activating the given tool renders disabled — true
 * when the active tool is host-controlled (`props.activeTool`) and the entry
 * doesn't activate the forced tool (`setActiveTool` refuses it).
 */
export const isToolButtonDisabled = (app: AppClassProperties, type: string) =>
  app.props.activeTool != null && app.props.activeTool.type !== type;

export type ToolButtonComponentProps = {
  app: AppClassProperties;
  activeTool: UIAppState["activeTool"];
  /** hide the keybinding badge rendered in the button's corner */
  hideKeyBinding?: boolean;
  /**
   * hide all shortcut affordances (tooltip hint, aria-keyshortcuts, and the
   * keybinding badge) — used on mobile where there's no keyboard
   */
  hideShortcut?: boolean;
};

type ToolButtonBehavior = {
  /**
   * display the shortcut of another tool (tooltip, aria, keybinding badge) —
   * e.g. the lasso button shows the selection shortcut, which activates it
   * when lasso is the preferred selection tool
   */
  shortcutType?: ToolbarToolType;
  /**
   * custom activation — replaces the default track + `setActiveTool` (pen
   * detection still runs before it)
   */
  onSelect?: (
    app: AppClassProperties,
    data: { pointerType: PointerType | null },
  ) => void;
};

/**
 * Creates a toolbar button component for the given tool. Activation is
 * uniform: track + `setActiveTool` (recording the previous tool for toggle
 * tools), with pen detection on the first pen interaction.
 */
const createToolButton = (
  type: ToolbarToolType,
  behavior?: ToolButtonBehavior,
) => {
  const config = TOOLS[type];
  const shortcutType = behavior?.shortcutType ?? type;

  const ToolButtonComponent = ({
    app,
    activeTool,
    hideKeyBinding,
    hideShortcut,
  }: ToolButtonComponentProps) => {
    const label = capitalizeString(t(`toolBar.${type}`));
    const shortcut = hideShortcut ? null : getToolShortcut(app, shortcutType);

    return (
      <IconButton
        className={clsx({ fillable: config.fillable })}
        type="toggle"
        icon={config.icon}
        checked={activeTool.type === type}
        disabled={isToolButtonDisabled(app, type)}
        title={shortcut ? `${label} — ${shortcut}` : label}
        keyBindingLabel={
          hideKeyBinding || hideShortcut
            ? undefined
            : getToolLetter(app, shortcutType)
        }
        aria-label={label}
        aria-keyshortcuts={shortcut ?? undefined}
        data-testid={`toolbar-${type}`}
        onPointerDown={(event) => {
          // a draggable tool can be dragged out onto the canvas; a press that
          // stays put is still a click (`onSelect`)
          app.toolDrag.handleButtonPointerDown(type, event.nativeEvent);
        }}
        onSelect={({ pointerType }) => {
          if (!app.state.penDetected && pointerType === "pen") {
            app.togglePenMode(true);
          }

          if (behavior?.onSelect) {
            behavior.onSelect(app, { pointerType });
            return;
          }

          if (app.state.activeTool.type !== type) {
            trackEvent("toolbar", type, "ui");
            app.setActiveTool({ type });
          }
        }}
      />
    );
  };

  ToolButtonComponent.displayName = `${capitalizeString(type)}IconButton`;

  return ToolButtonComponent;
};

export const HandToolButton = createToolButton("hand");
export const RectangleToolButton = createToolButton("rectangle");
export const DiamondToolButton = createToolButton("diamond");
export const EllipseToolButton = createToolButton("ellipse");
export const ArrowToolButton = createToolButton("arrow");
export const LineToolButton = createToolButton("line");
export const FreedrawToolButton = createToolButton("freedraw");
export const TextToolButton = createToolButton("text");
export const StickyNoteToolButton = createToolButton("stickynote");
export const ImageToolButton = createToolButton("image");
export const EraserToolButton = createToolButton("eraser");
export const FrameToolButton = createToolButton("frame");

/**
 * The selection tool button — pointer-clicking it while the selection tool
 * is active switches to lasso.
 */
export const SelectionToolButton = createToolButton("selection", {
  onSelect: (app, { pointerType }) => {
    if (app.state.activeTool.type === "selection" && pointerType !== null) {
      // pointer-clicking the active selection tool switches to lasso;
      // keyboard/AT activation stays on selection
      app.setActiveTool({ type: "lasso" });
      return;
    }

    if (app.state.activeTool.type !== "selection") {
      trackEvent("toolbar", "selection", "ui");
      app.setActiveTool({ type: "selection" });
    }
  },
});

/**
 * Rendered in place of the selection button when lasso is the preferred
 * selection tool; the selection shortcut activates it then.
 */
export const LassoToolButton = createToolButton("lasso", {
  shortcutType: "selection",
});

/**
 * The selection ⇄ lasso popover used in compact (tablet) and mobile
 * toolbars; picking an option also makes it the preferred selection tool.
 */
export const SelectionToolPopover = ({
  app,
  activeTool,
  setAppState,
}: {
  app: AppClassProperties;
  activeTool: UIAppState["activeTool"];
  setAppState: React.Component<any, AppState>["setState"];
}) => {
  const SELECTION_TOOLS = [
    {
      type: "selection",
      icon: TOOLS.selection.icon,
      fillable: TOOLS.selection.fillable,
      title: capitalizeString(t("toolBar.selection")),
    },
    {
      type: "lasso",
      icon: TOOLS.lasso.icon,
      fillable: TOOLS.lasso.fillable,
      title: capitalizeString(t("toolBar.lasso")),
    },
  ] as const;

  const displayedOption =
    SELECTION_TOOLS.find(
      (tool) => tool.type === app.state.preferredSelectionTool.type,
    ) || SELECTION_TOOLS[0];

  return (
    <ToolPopover
      app={app}
      options={SELECTION_TOOLS}
      activeTool={activeTool}
      defaultOption={app.state.preferredSelectionTool.type}
      data-testid="toolbar-selection"
      onToolChange={(type: string) => {
        if (type === "selection" || type === "lasso") {
          app.setActiveTool({ type });
          setAppState({
            preferredSelectionTool: { type, initialized: true },
          });
        }
      }}
      displayedOption={displayedOption}
    />
  );
};

/**
 * The freedraw ⇄ draw-shape popover used in compact (tablet) and mobile
 * toolbars. The trigger remembers and displays the most recently used option.
 */
export const FreedrawToolPopover = ({
  app,
  activeTool,
}: {
  app: AppClassProperties;
  activeTool: UIAppState["activeTool"];
}) => {
  const DRAWING_TOOLS = [
    {
      type: "freedraw",
      icon: TOOLS.freedraw.icon,
      fillable: TOOLS.freedraw.fillable,
      title: capitalizeString(t("toolBar.freedraw")),
    },
    {
      type: "autoshape",
      icon: TOOLS.autoshape.icon,
      fillable: TOOLS.autoshape.fillable,
      title: capitalizeString(t("toolBar.autoshape")),
    },
  ] as const;

  const [lastDrawingTool, setLastDrawingTool] = useState<
    typeof DRAWING_TOOLS[number]["type"]
  >(activeTool.type === "autoshape" ? "autoshape" : "freedraw");

  useEffect(() => {
    if (activeTool.type === "freedraw" || activeTool.type === "autoshape") {
      setLastDrawingTool(activeTool.type);
    }
  }, [activeTool.type]);

  const displayedOption =
    DRAWING_TOOLS.find((tool) => tool.type === lastDrawingTool) ||
    DRAWING_TOOLS[0];

  return (
    <ToolPopover
      app={app}
      options={DRAWING_TOOLS}
      activeTool={activeTool}
      defaultOption={lastDrawingTool}
      data-testid="toolbar-freedraw"
      onToolChange={(type: string) => {
        if (type === "freedraw" || type === "autoshape") {
          setLastDrawingTool(type);
          app.setActiveTool({ type });
        }
      }}
      displayedOption={displayedOption}
    />
  );
};
