import { EVENT, Emitter, KEYS, POINTER_BUTTON } from "@excalidraw/common";

import { isLegacyLayerUI } from "./zen/legacyLayerUI";

import type { CommandId } from "../keymap";
import type { ToolType } from "../types";
import type App from "./App";

/** no slice is selected while the pointer is closer to the center */
export const TOOL_RING_DEAD_ZONE = 24; // px
/** the outer edge of the slices; crossing it on the "more" slice opens the
 * sub-ring */
export const TOOL_RING_RADIUS = 104; // px
/** the distance between the ring and the edge of the editor */
const VIEWPORT_MARGIN = 8; // px
/** a primary click farther from the center closes a sticky ring */
const STICKY_CLICK_RADIUS = TOOL_RING_RADIUS * 1.5;

export const TOOL_RING_MAX_ITEMS = 8;

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

export type ToolRingSlice =
  | { type: "command"; id: CommandId }
  | { type: "more" };

export type ToolRingState = {
  /** the center, in client coordinates */
  center: { x: number; y: number };
  slices: readonly ToolRingSlice[];
  /** the index of the slice in the direction of the pointer */
  highlighted: number | null;
  level: "main" | "more";
  /** opened from the keyboard, and the key is released: the ring stays
   * open until a click, a digit key or Escape */
  sticky: boolean;
};

/**
 * The index of the slice in the direction of `point`, or `null` in the
 * dead zone. Slice 0 points up; the slices follow clockwise. The distance
 * from the center does not change the result.
 */
export const getToolRingSliceIndex = (
  center: { x: number; y: number },
  point: { x: number; y: number },
  sliceCount: number,
): number | null => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (sliceCount === 0 || Math.hypot(dx, dy) < TOOL_RING_DEAD_ZONE) {
    return null;
  }
  const sliceAngle = (Math.PI * 2) / sliceCount;
  // clockwise from the top
  const angle = Math.atan2(dx, -dy);
  return (
    ((Math.round(angle / sliceAngle) % sliceCount) + sliceCount) % sliceCount
  );
};

/**
 * The tool ring: a circular palette of commands at the pointer. A
 * secondary-button drag opens it (see `AppPan`), and the release runs the
 * command of the slice in the direction of the pointer. The `ui.toolRing`
 * command opens it from the keyboard.
 */
export class AppToolRing {
  private state: ToolRingState | null = null;
  private teardown: (() => void) | null = null;
  readonly onChange = new Emitter<[state: ToolRingState | null]>();

  constructor(private app: App) {}

  getState = () => this.state;

  isOpen = () => this.state !== null;

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

  private setState = (state: ToolRingState | null) => {
    this.state = state;
    this.onChange.trigger(state);
  };

  /** moves the center so that the ring fits in the editor */
  private clampCenter = (point: { x: number; y: number }) => {
    const { offsetLeft, offsetTop, width, height } = this.app.state;
    const margin = TOOL_RING_RADIUS + VIEWPORT_MARGIN;
    const clamp = (value: number, min: number, max: number) =>
      max < min ? (min + max) / 2 : Math.min(Math.max(value, min), max);
    return {
      x: clamp(point.x, offsetLeft + margin, offsetLeft + width - margin),
      y: clamp(point.y, offsetTop + margin, offsetTop + height - margin),
    };
  };

  private getMainSlices = (): ToolRingSlice[] => {
    const { items, more } = this.getConfig();
    return [
      ...items.map((id): ToolRingSlice => ({ type: "command", id })),
      ...(more?.length ? [{ type: "more" } as const] : []),
    ];
  };

  /** opens the ring at the point (client coordinates) */
  open = (point: { x: number; y: number }) => {
    if (!this.canOpen()) {
      return false;
    }
    this.close();
    this.setState({
      center: this.clampCenter(point),
      slices: this.getMainSlices(),
      highlighted: null,
      level: "main",
      sticky: false,
    });

    const { ownerWindow } = this.app;
    const onPointerMove = (event: PointerEvent) => this.move(event);
    const onPointerDown = (event: PointerEvent) => {
      if (!this.state?.sticky) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.button !== POINTER_BUTTON.MAIN) {
        this.close();
        return;
      }
      const { center } = this.state;
      const point = { x: event.clientX, y: event.clientY };
      this.move(event);
      if (
        Math.hypot(point.x - center.x, point.y - center.y) > STICKY_CLICK_RADIUS
      ) {
        this.close();
      } else {
        this.release({ shiftKey: event.shiftKey });
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYS.ESCAPE) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        return;
      }
      // digit keys pick a slice of a sticky ring
      const digit = /^Digit([1-9])$/.exec(event.code)?.[1];
      if (this.state?.sticky && digit) {
        event.preventDefault();
        event.stopPropagation();
        const index = Number(digit) - 1;
        if (index < this.state.slices.length) {
          this.setState({ ...this.state, highlighted: index });
          this.release({ shiftKey: event.shiftKey });
        }
      }
    };
    ownerWindow.addEventListener(EVENT.POINTER_MOVE, onPointerMove, {
      passive: true,
    });
    ownerWindow.addEventListener(EVENT.POINTER_DOWN, onPointerDown, {
      capture: true,
    });
    ownerWindow.addEventListener(EVENT.KEYDOWN, onKeyDown, { capture: true });
    ownerWindow.addEventListener(EVENT.BLUR, this.close);
    this.teardown = () => {
      ownerWindow.removeEventListener(EVENT.POINTER_MOVE, onPointerMove);
      ownerWindow.removeEventListener(EVENT.POINTER_DOWN, onPointerDown, {
        capture: true,
      });
      ownerWindow.removeEventListener(EVENT.KEYDOWN, onKeyDown, {
        capture: true,
      });
      ownerWindow.removeEventListener(EVENT.BLUR, this.close);
    };
    return true;
  };

  /** opens the ring at the last pointer position (the `ui.toolRing`
   * command). A sticky ring stays open until a click, a digit key or
   * Escape. */
  openAtPointer = (opts: { sticky?: boolean } = {}) => {
    const event = this.app.lastPointerMoveEvent;
    const { offsetLeft, offsetTop, width, height } = this.app.state;
    const opened = this.open(
      event
        ? { x: event.clientX, y: event.clientY }
        : { x: offsetLeft + width / 2, y: offsetTop + height / 2 },
    );
    if (opened && opts.sticky && this.state) {
      this.setState({ ...this.state, sticky: true });
    }
    return opened;
  };

  /** highlights the slice in the direction of the pointer */
  move = (point: { clientX: number; clientY: number }) => {
    const { state } = this;
    if (!state) {
      return;
    }
    const position = { x: point.clientX, y: point.clientY };
    const highlighted = getToolRingSliceIndex(
      state.center,
      position,
      state.slices.length,
    );
    const slice = highlighted === null ? null : state.slices[highlighted];
    const distance = Math.hypot(
      position.x - state.center.x,
      position.y - state.center.y,
    );
    if (slice?.type === "more" && distance > TOOL_RING_RADIUS) {
      this.setState({
        ...state,
        center: this.clampCenter(position),
        slices: (this.getConfig().more ?? []).map(
          (id): ToolRingSlice => ({ type: "command", id }),
        ),
        highlighted: null,
        level: "more",
      });
      return;
    }
    if (highlighted !== state.highlighted) {
      this.setState({ ...state, highlighted });
    }
  };

  /**
   * Runs the command of the highlighted slice and closes the ring. Shift
   * locks a tool. A release in the dead zone runs no command.
   *
   * With `keepOpenInDeadZone` (the key release of `ui.toolRing`), a release
   * in the dead zone keeps the ring open as a sticky ring instead.
   */
  release = (opts: { shiftKey?: boolean; keepOpenInDeadZone?: boolean }) => {
    const { state } = this;
    if (!state) {
      return;
    }
    const slice =
      state.highlighted === null ? null : state.slices[state.highlighted];
    if (!slice || slice.type === "more") {
      if (opts.keepOpenInDeadZone) {
        this.setState({ ...state, sticky: true });
      } else {
        this.close();
      }
      return;
    }
    this.close();
    this.run(slice.id, !!opts.shiftKey);
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

  close = () => {
    this.teardown?.();
    this.teardown = null;
    if (this.state) {
      this.setState(null);
    }
  };
}
