import clsx from "clsx";
import { useSyncExternalStore } from "react";

import { t } from "../../i18n";
import { TOOLS } from "../Tools";
import { RING_INNER_RADIUS, RING_RADIUS, getRingIconOffset } from "../App.ring";

import "./Ring.scss";

import type { UIAppState } from "../../types";
import type { AppRing, RingState } from "../App.ring";

const SIZE = RING_RADIUS * 2;

const polar = (radius: number, angle: number) => ({
  x: RING_RADIUS + radius * Math.sin(angle),
  y: RING_RADIUS - radius * Math.cos(angle),
});

/** the path of an annular sector; angles clockwise from the top */
const getSlicePath = (start: number, end: number) => {
  const outerStart = polar(RING_RADIUS, start);
  const outerEnd = polar(RING_RADIUS, end);
  const innerEnd = polar(RING_INNER_RADIUS, end);
  const innerStart = polar(RING_INNER_RADIUS, start);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${RING_RADIUS} ${RING_RADIUS} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${RING_INNER_RADIUS} ${RING_INNER_RADIUS} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};

const useRingState = (ring: AppRing) =>
  useSyncExternalStore((onChange) => ring.onChange.on(onChange), ring.getState);

const RingView = ({
  appState,
  state,
  testId,
  center,
}: {
  appState: UIAppState;
  state: RingState;
  testId: string;
  center: React.ReactNode;
}) => {
  const { slices, highlighted } = state;
  const sliceAngle = (Math.PI * 2) / slices.length;
  const highlightedSlice = highlighted === null ? null : slices[highlighted];

  return (
    <div
      className={clsx("Ring", { "Ring--sticky": state.sticky })}
      data-testid={testId}
      data-level={state.level}
      style={{
        left: state.center.x - appState.offsetLeft - RING_RADIUS,
        top: state.center.y - appState.offsetTop - RING_RADIUS,
        width: SIZE,
        height: SIZE,
      }}
    >
      <svg className="Ring__slices" width={SIZE} height={SIZE}>
        {slices.map((slice, index) => (
          <path
            key={index}
            className={clsx("Ring__slice", {
              "Ring__slice--highlighted": index === highlighted,
              "Ring__slice--active": slice.active,
            })}
            d={
              slices.length === 1
                ? getSlicePath(0, Math.PI * 2 - 0.0001)
                : getSlicePath(
                    index * sliceAngle - sliceAngle / 2,
                    index * sliceAngle + sliceAngle / 2,
                  )
            }
          />
        ))}
      </svg>
      {slices.map((slice, index) => {
        const offset = getRingIconOffset(index, slices.length);
        return (
          <div
            key={index}
            className={clsx("Ring__icon", {
              "Ring__icon--highlighted": index === highlighted,
            })}
            data-testid={`${testId}-slice-${slice.id}`}
            title={slice.label}
            style={{
              left: RING_RADIUS + offset.x,
              top: RING_RADIUS + offset.y,
            }}
          >
            {typeof slice.icon === "string" ? (
              // a command without an icon (e.g. a host command) shows its
              // initial
              <span className="Ring__text">{slice.icon}</span>
            ) : (
              slice.icon
            )}
          </div>
        );
      })}
      {center}
      {highlightedSlice && (
        <div className="Ring__label">{highlightedSlice.label}</div>
      )}
    </div>
  );
};

export const ToolRing = ({
  ring,
  appState,
}: {
  ring: AppRing;
  appState: UIAppState;
}) => {
  const state = useRingState(ring);
  if (!state) {
    return null;
  }
  const { activeTool } = appState;
  const activeIcon =
    activeTool.type in TOOLS
      ? TOOLS[activeTool.type as keyof typeof TOOLS].icon
      : null;
  return (
    <RingView
      appState={appState}
      state={state}
      testId="tool-ring"
      center={
        <div className="Ring__center" aria-label={t("zen.activeTool")}>
          {activeIcon}
        </div>
      }
    />
  );
};

export const StyleRing = ({
  ring,
  appState,
}: {
  ring: AppRing;
  appState: UIAppState;
}) => {
  const state = useRingState(ring);
  return state ? (
    <RingView
      appState={appState}
      state={state}
      testId="style-ring"
      center={<div className="Ring__center" aria-label={t("zen.styleRing")} />}
    />
  ) : null;
};
