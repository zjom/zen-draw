// Excalidraw's toolbar icons, which it doesn't export. Trimmed from
// https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/icons.tsx
// (MIT); keep in sync with the installed version's toolbar.

import type { ToolType } from "@excalidraw/excalidraw/types";

import type { ReactNode, SVGProps } from "react";

type Opts = {
  width?: number;
  height?: number;
} & SVGProps<SVGSVGElement>;

const createIcon = (d: ReactNode, opts: number | Opts = 512) => {
  const {
    width = 512,
    height = width,
    ...rest
  } = typeof opts === "number" ? { width: opts } : opts;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      {...rest}
    >
      {d}
    </svg>
  );
};

const tablerIconProps: Opts = {
  width: 24,
  height: 24,
  fill: "none",
  strokeWidth: 2,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const modifiedTablerIconProps: Opts = {
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// -----------------------------------------------------------------------------

// custom
const SelectionIcon = createIcon(
  <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 6l4.153 11.793a0.365 .365 0 0 0 .331 .207a0.366 .366 0 0 0 .332 -.207l2.184 -4.793l4.787 -1.994a0.355 .355 0 0 0 .213 -.323a0.355 .355 0 0 0 -.213 -.323l-11.787 -4.36z" />
    <path d="M13.5 13.5l4.5 4.5" />
  </g>,
  { fill: "none", width: 22, height: 22, strokeWidth: 1.25 },
);

// tabler-icons: square
const RectangleIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="4" y="4" width="16" height="16" rx="2"></rect>
  </g>,
  tablerIconProps,
);

// tabler-icons: square-rotated
const DiamondIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10.5 20.4l-6.9 -6.9c-.781 -.781 -.781 -2.219 0 -3l6.9 -6.9c.781 -.781 2.219 -.781 3 0l6.9 6.9c.781 .781 .781 2.219 0 3l-6.9 6.9c-.781 .781 -2.219 .781 -3 0z" />
  </g>,

  tablerIconProps,
);

// tabler-icons: circle
const EllipseIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="12" cy="12" r="9"></circle>
  </g>,

  tablerIconProps,
);

// tabler-icons: arrow-narrow-right
const ArrowIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="5" y1="12" x2="19" y2="12" />
    <line x1="15" y1="16" x2="19" y2="12" />
    <line x1="15" y1="8" x2="19" y2="12" />
  </g>,
  tablerIconProps,
);

// custom?
const LineIcon = createIcon(
  <path d="M4.167 10h11.666" strokeWidth="1.5" />,
  modifiedTablerIconProps,
);

// modified tabler-icons: pencil
const FreedrawIcon = createIcon(
  <g strokeWidth="1.25">
    <path
      clipRule="evenodd"
      d="m7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z"
    />
    <path d="m11.25 5.417 3.333 3.333" />
  </g>,

  modifiedTablerIconProps,
);

// tabler-icons: typography
const TextIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="4" y1="20" x2="7" y2="20" />
    <line x1="14" y1="20" x2="21" y2="20" />
    <line x1="6.9" y1="15" x2="13.8" y2="15" />
    <line x1="10.2" y1="6.3" x2="16" y2="20" />
    <polyline points="5 20 11 4 13 4 20 20"></polyline>
  </g>,
  tablerIconProps,
);

// modified tabler-icons: photo
const ImageIcon = createIcon(
  <g strokeWidth="1.25">
    <path d="M12.5 6.667h.01" />
    <path d="M4.91 2.625h10.18a2.284 2.284 0 0 1 2.285 2.284v10.182a2.284 2.284 0 0 1-2.284 2.284H4.909a2.284 2.284 0 0 1-2.284-2.284V4.909a2.284 2.284 0 0 1 2.284-2.284Z" />
    <path d="m3.333 12.5 3.334-3.333c.773-.745 1.726-.745 2.5 0l4.166 4.166" />
    <path d="m11.667 11.667.833-.834c.774-.744 1.726-.744 2.5 0l1.667 1.667" />
  </g>,
  modifiedTablerIconProps,
);

// tabler-icons: eraser
const EraserIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" />
    <path d="M18 13.3l-6.3 -6.3" />
  </g>,
  tablerIconProps,
);

const handIcon = createIcon(
  <g strokeWidth={1.25}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5"></path>
    <path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5"></path>
    <path d="M14 5.5a1.5 1.5 0 0 1 3 0v6.5"></path>
    <path d="M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"></path>
  </g>,
  tablerIconProps,
);

const frameToolIcon = createIcon(
  <g strokeWidth={1.5}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M4 7l16 0"></path>
    <path d="M4 17l16 0"></path>
    <path d="M7 4l0 16"></path>
    <path d="M17 4l0 16"></path>
  </g>,
  tablerIconProps,
);

const MagicIcon = createIcon(
  <g stroke="currentColor" fill="none">
    <path stroke="none" d="M0 0h24v24H0z" />
    <path d="M6 21l15 -15l-3 -3l-15 15l3 3" />
    <path d="M15 6l3 3" />
    <path d="M9 3a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
    <path d="M19 13a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
  </g>,
  tablerIconProps,
);

const EmbedIcon = createIcon(
  <g strokeWidth="1.5">
    <polyline points="12 16 18 10 12 4" />
    <polyline points="8 4 2 10 8 16" />
  </g>,
  modifiedTablerIconProps,
);

const laserPointerToolIcon = createIcon(
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    transform="rotate(90 10 10)"
  >
    <path
      clipRule="evenodd"
      d="m9.644 13.69 7.774-7.773a2.357 2.357 0 0 0-3.334-3.334l-7.773 7.774L8 12l1.643 1.69Z"
    />
    <path d="m13.25 3.417 3.333 3.333M10 10l2-2M5 15l3-3M2.156 17.894l1-1M5.453 19.029l-.144-1.407M2.377 11.887l.866 1.118M8.354 17.273l-1.194-.758M.953 14.652l1.408.13" />
  </g>,

  20,
);

export const toolIcons: Partial<Record<ToolType, ReactNode>> = {
  selection: SelectionIcon,
  rectangle: RectangleIcon,
  diamond: DiamondIcon,
  ellipse: EllipseIcon,
  arrow: ArrowIcon,
  line: LineIcon,
  freedraw: FreedrawIcon,
  text: TextIcon,
  image: ImageIcon,
  eraser: EraserIcon,
  hand: handIcon,
  frame: frameToolIcon,
  magicframe: MagicIcon,
  embeddable: EmbedIcon,
  laser: laserPointerToolIcon,
};
