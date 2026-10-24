import clsx from "clsx";
import { useSyncExternalStore } from "react";

import { t } from "../../i18n";
import { DotsHorizontalIcon } from "../icons";
import { TOOLS } from "../Tools";
import { TOOL_RING_DEAD_ZONE, TOOL_RING_RADIUS } from "../App.toolRing";

import "./ToolRing.scss";

import type { AppClassProperties, UIAppState } from "../../types";
import type { ToolRingSlice, ToolRingState } from "../App.toolRing";

/** the inner edge of the slices */
const INNER_RADIUS = TOOL_RING_DEAD_ZONE + 6;
/** the distance of the slice icons from the center */
const ICON_RADIUS = (INNER_RADIUS + TOOL_RING_RADIUS) / 2;
const SIZE = TOOL_RING_RADIUS * 2;

const polar = (radius: number, angle: number) => ({
  x: TOOL_RING_RADIUS + radius * Math.sin(angle),
  y: TOOL_RING_RADIUS - radius * Math.cos(angle),
});

/** the path of an annular sector; angles clockwise from the top */
const getSlicePath = (start: number, end: number) => {
  const outerStart = polar(TOOL_RING_RADIUS, start);
  const outerEnd = polar(TOOL_RING_RADIUS, end);
  const innerEnd = polar(INNER_RADIUS, end);
  const innerStart = polar(INNER_RADIUS, start);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${TOOL_RING_RADIUS} ${TOOL_RING_RADIUS} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};

const useToolRingState = (app: AppClassProperties) =>
  useSyncExternalStore(
    (onChange) => app.toolRing.onChange.on(onChange),
    app.toolRing.getState,
  );

const getSliceLabel = (app: AppClassProperties, slice: ToolRingSlice) =>
  slice.type === "more" ? t("zen.more") : app.commands.getLabel(slice.id);

const SliceIcon = ({
  app,
  slice,
}: {
  app: AppClassProperties;
  slice: ToolRingSlice;
}) => {
  if (slice.type === "more") {
    return <>{DotsHorizontalIcon}</>;
  }
  const icon = app.commands.getIcon(slice.id);
  return icon ? (
    <>{icon}</>
  ) : (
    // a command without an icon (e.g. a host command) shows its initial
    <span className="ToolRing__initial">
      {app.commands.getLabel(slice.id).charAt(0).toUpperCase()}
    </span>
  );
};

const ToolRingView = ({
  app,
  appState,
  state,
}: {
  app: AppClassProperties;
  appState: UIAppState;
  state: ToolRingState;
}) => {
  const { slices, highlighted } = state;
  const sliceAngle = (Math.PI * 2) / slices.length;
  const activeTool = appState.activeTool;
  const activeIcon =
    activeTool.type in TOOLS
      ? TOOLS[activeTool.type as keyof typeof TOOLS].icon
      : null;
  const highlightedSlice = highlighted === null ? null : slices[highlighted];

  return (
    <div
      className={clsx("ToolRing", { "ToolRing--sticky": state.sticky })}
      data-testid="tool-ring"
      data-level={state.level}
      style={{
        left: state.center.x - appState.offsetLeft - TOOL_RING_RADIUS,
        top: state.center.y - appState.offsetTop - TOOL_RING_RADIUS,
        width: SIZE,
        height: SIZE,
      }}
    >
      <svg className="ToolRing__slices" width={SIZE} height={SIZE}>
        {slices.map((slice, index) => (
          <path
            key={index}
            className={clsx("ToolRing__slice", {
              "ToolRing__slice--highlighted": index === highlighted,
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
        const position = polar(ICON_RADIUS, index * sliceAngle);
        return (
          <div
            key={index}
            className={clsx("ToolRing__icon", {
              "ToolRing__icon--highlighted": index === highlighted,
            })}
            data-testid={
              slice.type === "more"
                ? "tool-ring-more"
                : `tool-ring-slice-${slice.id}`
            }
            title={getSliceLabel(app, slice)}
            style={{ left: position.x, top: position.y }}
          >
            <SliceIcon app={app} slice={slice} />
          </div>
        );
      })}
      <div className="ToolRing__center" aria-label={t("zen.activeTool")}>
        {activeIcon}
      </div>
      {highlightedSlice && (
        <div className="ToolRing__label">
          {getSliceLabel(app, highlightedSlice)}
        </div>
      )}
    </div>
  );
};

export const ToolRing = ({
  app,
  appState,
}: {
  app: AppClassProperties;
  appState: UIAppState;
}) => {
  const state = useToolRingState(app);
  return state ? (
    <ToolRingView app={app} appState={appState} state={state} />
  ) : null;
};
