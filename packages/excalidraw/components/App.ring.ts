import { EVENT, Emitter, KEYS, POINTER_BUTTON } from "@excalidraw/common";

import type React from "react";

import type App from "./App";

/** no slice is selected while the pointer is closer to the center */
export const RING_DEAD_ZONE = 24; // px
/** the outer edge of the slices; crossing it on a slice with a sub-ring
 * opens the sub-ring */
export const RING_RADIUS = 104; // px
/** the inner edge of the slices */
export const RING_INNER_RADIUS = RING_DEAD_ZONE + 6;
/** the distance of the slice icons from the center */
export const RING_ICON_RADIUS = (RING_INNER_RADIUS + RING_RADIUS) / 2;
/** the distance between the ring and the edge of the editor */
const VIEWPORT_MARGIN = 8; // px
/** a primary click farther from the center closes a sticky ring */
const STICKY_CLICK_RADIUS = RING_RADIUS * 1.5;

/** a ring has at most 8 items, and a "more" slice */
export const RING_MAX_ITEMS = 8;

type Point = { x: number; y: number };

export type RingSlice = {
  /** unique in its ring level; the test ID of the slice is
   * `<ring test ID>-slice-<id>` */
  id: string;
  label: string;
  icon: React.ReactNode;
  /** the slice shows the current value (of a property) */
  active?: boolean;
  /**
   * Runs on the release of the slice. `lock` is true if Shift is held.
   * `point` is the position of the slice icon, in client coordinates.
   */
  run?: (opts: { lock: boolean; point: Point }) => void;
  /** the slices of a sub-ring. Crossing the outer edge of the slice opens
   * the sub-ring at the pointer; a release on the slice opens it in place */
  subRing?: () => RingSlice[];
};

export type RingState = {
  /** the center, in client coordinates */
  center: Point;
  slices: readonly RingSlice[];
  /** the index of the slice in the direction of the pointer */
  highlighted: number | null;
  /** `"main"`, or the ID of the slice whose sub-ring is open */
  level: string;
  /** opened from the keyboard, and the key is released: the ring stays
   * open until a click, a digit key or Escape */
  sticky: boolean;
};

/**
 * The index of the slice in the direction of `point`, or `null` in the
 * dead zone. Slice 0 points up; the slices follow clockwise. The distance
 * from the center does not change the result.
 */
export const getRingSliceIndex = (
  center: Point,
  point: Point,
  sliceCount: number,
): number | null => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (sliceCount === 0 || Math.hypot(dx, dy) < RING_DEAD_ZONE) {
    return null;
  }
  const sliceAngle = (Math.PI * 2) / sliceCount;
  // clockwise from the top
  const angle = Math.atan2(dx, -dy);
  return (
    ((Math.round(angle / sliceAngle) % sliceCount) + sliceCount) % sliceCount
  );
};

/** the position of the icon of slice `index` of `count` slices, relative to
 * the center */
export const getRingIconOffset = (index: number, count: number): Point => {
  const angle = (index * Math.PI * 2) / count;
  return {
    x: RING_ICON_RADIUS * Math.sin(angle),
    y: -RING_ICON_RADIUS * Math.cos(angle),
  };
};

/**
 * A circular palette of slices at the pointer: the base of the tool ring
 * and of the style ring. A secondary-button drag opens a ring (see
 * `AppPan`), and the release runs the slice in the direction of the
 * pointer. A `ui.*` press command opens a ring from the keyboard.
 */
export abstract class AppRing {
  private state: RingState | null = null;
  private teardown: (() => void) | null = null;
  readonly onChange = new Emitter<[state: RingState | null]>();

  constructor(protected app: App) {}

  /** whether the ring can open now */
  abstract canOpen(): boolean;

  /** the slices of the main level */
  protected abstract getMainSlices(): RingSlice[];

  getState = () => this.state;

  isOpen = () => this.state !== null;

  private setState = (state: RingState | null) => {
    this.state = state;
    this.onChange.trigger(state);
  };

  /** moves the center so that the ring fits in the editor */
  private clampCenter = (point: Point) => {
    const { offsetLeft, offsetTop, width, height } = this.app.state;
    const margin = RING_RADIUS + VIEWPORT_MARGIN;
    const clamp = (value: number, min: number, max: number) =>
      max < min ? (min + max) / 2 : Math.min(Math.max(value, min), max);
    return {
      x: clamp(point.x, offsetLeft + margin, offsetLeft + width - margin),
      y: clamp(point.y, offsetTop + margin, offsetTop + height - margin),
    };
  };

  /** opens the ring at the point (client coordinates) */
  open = (point: Point) => {
    if (!this.canOpen()) {
      return false;
    }
    const slices = this.getMainSlices();
    if (!slices.length) {
      return false;
    }
    this.app.closeRings();
    this.setState({
      center: this.clampCenter(point),
      slices,
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

  /** opens the ring at the last pointer position (a `ui.*` command). A
   * sticky ring stays open until a click, a digit key or Escape. */
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

  /** opens the sub-ring of `slice` at `center` */
  private openSubRing = (slice: RingSlice, center: Point, sticky: boolean) => {
    const slices = slice.subRing?.() ?? [];
    if (!slices.length) {
      this.close();
      return;
    }
    this.setState({
      center: this.clampCenter(center),
      slices,
      highlighted: null,
      level: slice.id,
      sticky,
    });
  };

  /** highlights the slice in the direction of the pointer */
  move = (point: { clientX: number; clientY: number }) => {
    const { state } = this;
    if (!state) {
      return;
    }
    const position = { x: point.clientX, y: point.clientY };
    const highlighted = getRingSliceIndex(
      state.center,
      position,
      state.slices.length,
    );
    const slice = highlighted === null ? null : state.slices[highlighted];
    const distance = Math.hypot(
      position.x - state.center.x,
      position.y - state.center.y,
    );
    if (slice?.subRing && distance > RING_RADIUS) {
      this.openSubRing(slice, position, state.sticky);
      return;
    }
    if (highlighted !== state.highlighted) {
      this.setState({ ...state, highlighted });
    }
  };

  /**
   * Runs the highlighted slice and closes the ring. Shift locks a tool. A
   * release in the dead zone runs nothing. A release on a slice with a
   * sub-ring opens the sub-ring in place, as a sticky ring.
   *
   * With `keepOpenInDeadZone` (the key release of a `ui.*` command), a
   * release in the dead zone keeps the ring open as a sticky ring instead.
   */
  release = (opts: { shiftKey?: boolean; keepOpenInDeadZone?: boolean }) => {
    const { state } = this;
    if (!state) {
      return;
    }
    const index = state.highlighted;
    const slice = index === null ? null : state.slices[index];
    if (!slice || index === null) {
      if (opts.keepOpenInDeadZone) {
        this.setState({ ...state, sticky: true });
      } else {
        this.close();
      }
      return;
    }
    if (slice.subRing) {
      this.openSubRing(slice, state.center, true);
      return;
    }
    const offset = getRingIconOffset(index, state.slices.length);
    this.close();
    slice.run?.({
      lock: !!opts.shiftKey,
      point: { x: state.center.x + offset.x, y: state.center.y + offset.y },
    });
  };

  close = () => {
    this.teardown?.();
    this.teardown = null;
    if (this.state) {
      this.setState(null);
    }
  };
}
