import {
  ARROW_TYPE,
  FONT_SIZES,
  STROKE_WIDTH_KEYS,
  THEME,
  applyDarkModeFilter,
  getStrokeWidthByKey,
  isTransparent,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";

import {
  getArrowheadForPicker,
  getBaseFontSize,
  getBoundTextElement,
  getColorTargetElement,
  getCommonBounds,
  hasFillStyle,
  isArrowElement,
  isLinearElement,
  isTextElement,
} from "@excalidraw/element";

import type { StrokeWidthKey } from "@excalidraw/common";

import type {
  Arrowhead,
  ExcalidrawElement,
  ExcalidrawTextElement,
  Theme,
} from "@excalidraw/element/types";

import { getFormValue } from "../actions/actionProperties";
import {
  actionChangeArrowhead,
  actionChangeBackgroundColor,
  actionChangeStrokeColor,
  actionChangeArrowType,
  actionChangeFillStyle,
  actionChangeFontFamily,
  actionChangeFontSize,
  actionChangeOpacity,
  actionChangeRoundness,
  actionChangeSloppiness,
  actionChangeStrokeStyle,
  actionChangeStrokeWidth,
  actionChangeTextAlign,
} from "../actions/actionProperties";
import {
  actionBringForward,
  actionBringToFront,
  actionSendBackward,
  actionSendToBack,
} from "../actions/actionZindex";
import { resolveColorTarget } from "../actions/colorTargets";
import { getLanguage, t } from "../i18n";
import { getTargetElements } from "../scene";

import { AppRing, RING_MAX_ITEMS } from "./App.ring";
import { DEFAULT_FONTS } from "./FontPicker/FontPicker";
import {
  ArrowheadArrowIcon,
  ArrowheadBarIcon,
  ArrowheadCircleIcon,
  ArrowheadCircleOutlineIcon,
  ArrowheadDiamondIcon,
  ArrowheadNoneIcon,
  ArrowheadTriangleIcon,
  ArrowheadTriangleOutlineIcon,
  BringForwardIcon,
  BringToFrontIcon,
  DotsHorizontalIcon,
  EdgeRoundIcon,
  EdgeSharpIcon,
  FillCrossHatchIcon,
  FillHachureIcon,
  FillSolidIcon,
  FontSizeExtraLargeIcon,
  FontSizeLargeIcon,
  FontSizeMediumIcon,
  FontSizeSmallIcon,
  SendBackwardIcon,
  SendToBackIcon,
  SloppinessArchitectIcon,
  SloppinessArtistIcon,
  SloppinessCartoonistIcon,
  StrokeStyleDashedIcon,
  StrokeStyleDottedIcon,
  StrokeWidthBaseIcon,
  StrokeWidthBoldIcon,
  StrokeWidthExtraBoldIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  elbowArrowIcon,
  roundArrowIcon,
  sharpArrowIcon,
} from "./icons";
import { getShapeActionPredicates } from "./shapeActionPredicates";

import { isLegacyLayerUI } from "./zen/legacyLayerUI";

import type { ShapeActionPredicates } from "./shapeActionPredicates";

import type { Action } from "../actions/types";
import type { RingSlice } from "./App.ring";
import type { Primitive } from "../types";

/** the opacity values of the opacity sub-ring */
const OPACITY_VALUES = [100, 90, 75, 50, 25, 10];

/** the style properties of the predicates; if none applies to the active
 * tool, the tool draws no elements */
const STYLE_PREDICATES = [
  "strokeColor",
  "backgroundColor",
  "fill",
  "strokeWidth",
  "strokeStyle",
  "sloppiness",
  "roundness",
  "arrowType",
  "arrowheads",
  "text",
  "textAlign",
] as const;

/** with nothing selected and a tool that draws no elements, the style ring
 * shows the properties of these tools together */
const DEFAULTS_TOOLS = ["rectangle", "arrow", "text"] as const;

export type StyleRingColorPickerType = "elementStroke" | "elementBackground";

type Option<T> = { value: T; label: string; icon: React.ReactNode };

const percent = (value: number | null) => (
  <span className="Ring__text">{value === null ? "%" : `${value}%`}</span>
);

/** a transparent or mixed color shows a slash */
const swatch = (color: string | null, theme: Theme) => (
  <span
    className="Ring__swatch"
    style={
      color && !isTransparent(color)
        ? { background: applyDarkModeFilter(color, theme === THEME.DARK) }
        : undefined
    }
  />
);

/**
 * The style ring: a ring of the properties that apply to the selected
 * elements (see `AppRing`). With nothing selected, it changes the defaults
 * of new elements (`appState.currentItem*`): the properties of the active
 * tool, or of all tools if the active tool draws no elements. A property
 * opens a sub-ring of its values; a color opens the color picker at the
 * slice. A secondary-button drag that starts on the selection or with Shift
 * held opens it. The `ui.styleRing` command opens it from the keyboard.
 */
export class AppStyleRing extends AppRing {
  /** where the color picker opens, in client coordinates. Unset, it opens
   * at the pointer */
  private colorPickerAnchor: { x: number; y: number } | null = null;

  canOpen = () =>
    !isLegacyLayerUI() &&
    this.app.isInteractionEnabled() &&
    !this.app.state.viewModeEnabled &&
    !this.app.state.editingTextElement;

  /** nothing is selected: the style ring changes the defaults of new
   * elements */
  editsDefaults = () =>
    this.app.scene.getSelectedElements(this.app.state).length === 0;

  /** whether a secondary-button drag that starts at the point (client
   * coordinates) starts on the selection */
  isOnSelection = (point: { clientX: number; clientY: number }) => {
    const selectedElements = this.app.scene.getSelectedElements(this.app.state);
    if (!selectedElements.length) {
      return false;
    }
    const { x, y } = viewportCoordsToSceneCoords(point, this.app.state);
    const hitElement = this.app.getElementAtPosition(x, y, {
      preferSelected: true,
    });
    if (hitElement && this.app.state.selectedElementIds[hitElement.id]) {
      return true;
    }
    const [x1, y1, x2, y2] = getCommonBounds(selectedElements);
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  };

  getColorPickerAnchor = () => {
    if (this.colorPickerAnchor) {
      return this.colorPickerAnchor;
    }
    const event = this.app.lastPointerMoveEvent;
    const { offsetLeft, offsetTop, width, height } = this.app.state;
    return event
      ? { x: event.clientX, y: event.clientY }
      : { x: offsetLeft + width / 2, y: offsetTop + height / 2 };
  };

  /** opens the color picker of the selection at the point */
  openColorPicker = (
    type: StyleRingColorPickerType,
    point: { x: number; y: number },
  ) => {
    this.colorPickerAnchor = point;
    this.app.setState({ openPopup: type });
  };

  /** changes the color of the color picker, or closes it
   * (`{ openPopup: null }`) */
  updateColor = (type: StyleRingColorPickerType, data: unknown) => {
    this.execute(
      type === "elementStroke"
        ? actionChangeStrokeColor
        : actionChangeBackgroundColor,
      data as Parameters<typeof actionChangeStrokeColor.perform>[2],
    );
  };

  /** the color picker closed: a later one (`s`, `g`) opens at the pointer */
  onColorPickerClose = () => {
    this.colorPickerAnchor = null;
  };

  private execute = <T extends Action>(
    action: T,
    value: Parameters<T["perform"]>[2] = null,
  ) => {
    this.app.actionManager.executeAction(action, "ui", value);
  };

  /** the common value of the selected elements, or null if they differ.
   * With nothing selected, the default of new elements */
  private getValue = <T extends Primitive>(
    getValue: (element: ExcalidrawElement) => T,
    predicate: true | ((element: ExcalidrawElement) => boolean),
    defaultValue: T,
  ) =>
    getFormValue<T | null>(
      this.app.scene.getElementsIncludingDeleted(),
      this.app,
      getValue,
      predicate,
      (hasSelection) => (hasSelection ? null : defaultValue),
    );

  /** a property with a sub-ring of its values */
  private property = <T,>(
    id: string,
    label: string,
    current: T | null,
    options: Option<T>[],
    apply: (value: T) => void,
  ): RingSlice => ({
    id,
    label,
    icon:
      options.find((option) => option.value === current)?.icon ??
      options[0].icon,
    subRing: () =>
      options.map((option) => ({
        id: `${id}.${option.value}`,
        label: option.label,
        icon: option.icon,
        active: option.value === current,
        run: () => apply(option.value),
      })),
  });

  private colorProperty = (
    type: StyleRingColorPickerType,
    label: string,
    color: string | null,
  ): RingSlice => ({
    id: type === "elementStroke" ? "strokeColor" : "backgroundColor",
    label,
    icon: swatch(color, this.app.state.theme),
    run: ({ point }) => this.openColorPicker(type, point),
  });

  /** the font size of a text element, or of the label of a container */
  private getFontSize = (element: ExcalidrawElement) => {
    const elementsMap = this.app.scene.getNonDeletedElementsMap();
    const text = isTextElement(element)
      ? element
      : getBoundTextElement(element, elementsMap);
    return text ? getBaseFontSize(text, elementsMap) : null;
  };

  /** a text element, or the label of a container */
  private getText = (element: ExcalidrawElement) =>
    isTextElement(element)
      ? element
      : getBoundTextElement(element, this.app.scene.getNonDeletedElementsMap());

  private hasText = (element: ExcalidrawElement) => !!this.getText(element);

  private getArrowheadProperty = (position: "start" | "end") => {
    const isRTL = getLanguage().rtl;
    // the start arrowhead points left (as in the properties panel)
    const flip = position === "start" ? !isRTL : !!isRTL;
    const options: Option<Arrowhead | null>[] = (
      [
        [null, "none", ArrowheadNoneIcon],
        ["arrow", "arrow", ArrowheadArrowIcon],
        ["triangle", "triangle", ArrowheadTriangleIcon],
        ["triangle_outline", "triangle_outline", ArrowheadTriangleOutlineIcon],
        ["circle", "circle", ArrowheadCircleIcon],
        ["circle_outline", "circle_outline", ArrowheadCircleOutlineIcon],
        ["diamond", "diamond", ArrowheadDiamondIcon],
        ["bar", "bar", ArrowheadBarIcon],
      ] as const
    ).map(([value, name, Icon]) => ({
      value,
      label: t(`labels.arrowhead_${name}`),
      icon: <Icon flip={flip} />,
    }));
    return this.property(
      `${position}Arrowhead`,
      position === "start" ? t("zen.startArrowhead") : t("zen.endArrowhead"),
      this.getValue<Arrowhead | null>(
        (element) =>
          isLinearElement(element)
            ? getArrowheadForPicker(
                position === "start"
                  ? element.startArrowhead
                  : element.endArrowhead,
              )
            : null,
        isLinearElement,
        getArrowheadForPicker(
          position === "start"
            ? this.app.state.currentItemStartArrowhead
            : this.app.state.currentItemEndArrowhead,
        ),
      ),
      options,
      // `null` removes the arrowhead (as in the properties panel)
      (type) =>
        this.execute(actionChangeArrowhead, {
          position,
          type: type as Arrowhead,
        }),
    );
  };

  /** the properties that apply to the selected elements, in order */
  getProperties = (): RingSlice[] => {
    const { app } = this;
    const { state: appState } = app;
    const elements = app.scene.getElementsIncludingDeleted();
    const elementsMap = app.scene.getNonDeletedElementsMap();
    const targetElements = getTargetElements(elementsMap, appState);
    const getPredicates = (toolType?: typeof DEFAULTS_TOOLS[number]) =>
      getShapeActionPredicates(
        toolType
          ? {
              ...appState,
              activeTool: {
                ...appState.activeTool,
                type: toolType,
                customType: null,
              },
            }
          : appState,
        targetElements,
        elementsMap,
        app,
      );
    let applies = getPredicates();
    const editsDefaults = !targetElements.length;
    if (editsDefaults && !STYLE_PREDICATES.some((key) => applies[key])) {
      const all = DEFAULTS_TOOLS.map((type) => getPredicates(type));
      applies = Object.fromEntries(
        Object.keys(applies).map((key) => [
          key,
          all.some((predicates) => predicates[key as keyof typeof predicates]),
        ]),
      ) as ShapeActionPredicates;
    }
    const properties: RingSlice[] = [];

    if (applies.strokeColor) {
      const target = resolveColorTarget(appState, elements, "strokeColor");
      properties.push(
        this.colorProperty(
          "elementStroke",
          target.kind === "sticky" ? t("labels.textColor") : t("labels.stroke"),
          this.getValue(
            (element) => element.strokeColor,
            true,
            target.currentValue,
          ),
        ),
      );
    }
    if (applies.backgroundColor) {
      properties.push(
        this.colorProperty(
          "elementBackground",
          t("labels.background"),
          this.getValue(
            (element) =>
              getColorTargetElement(element, "backgroundColor", elementsMap)
                .backgroundColor,
            true,
            resolveColorTarget(appState, elements, "backgroundColor")
              .currentValue,
          ),
        ),
      );
    }
    if (applies.opacity) {
      const opacity = this.getValue(
        (element) => element.opacity,
        true,
        appState.currentItemOpacity,
      );
      properties.push({
        ...this.property(
          "opacity",
          t("labels.opacity"),
          opacity,
          OPACITY_VALUES.map((value) => ({
            value,
            label: `${value}%`,
            icon: percent(value),
          })),
          (value) => this.execute(actionChangeOpacity, value),
        ),
        icon: percent(opacity),
      });
    }
    if (applies.strokeWidth) {
      properties.push(
        this.property(
          "strokeWidth",
          t("labels.strokeWidth"),
          this.getValue(
            (element) =>
              STROKE_WIDTH_KEYS.find(
                (key) =>
                  getStrokeWidthByKey(element.type, key) ===
                  element.strokeWidth,
              ) ?? null,
            (element) => element.hasOwnProperty("strokeWidth"),
            appState.currentItemStrokeWidthKey,
          ),
          [
            {
              value: "thin",
              label: t("labels.thin"),
              icon: StrokeWidthBaseIcon,
            },
            {
              value: "medium",
              label: t("labels.medium"),
              icon: StrokeWidthBoldIcon,
            },
            {
              value: "bold",
              label: t("labels.bold"),
              icon: StrokeWidthExtraBoldIcon,
            },
          ] as Option<StrokeWidthKey>[],
          (value) => this.execute(actionChangeStrokeWidth, value),
        ),
      );
    }
    if (applies.strokeStyle) {
      properties.push(
        this.property(
          "strokeStyle",
          t("labels.strokeStyle"),
          this.getValue(
            (element) => element.strokeStyle,
            (element) => element.hasOwnProperty("strokeStyle"),
            appState.currentItemStrokeStyle,
          ),
          [
            {
              value: "solid",
              label: t("labels.strokeStyle_solid"),
              icon: StrokeWidthBaseIcon,
            },
            {
              value: "dashed",
              label: t("labels.strokeStyle_dashed"),
              icon: StrokeStyleDashedIcon,
            },
            {
              value: "dotted",
              label: t("labels.strokeStyle_dotted"),
              icon: StrokeStyleDottedIcon,
            },
          ] as Option<ExcalidrawElement["strokeStyle"]>[],
          (value) => this.execute(actionChangeStrokeStyle, value),
        ),
      );
    }
    if (applies.fill) {
      properties.push(
        this.property(
          "fill",
          t("labels.fill"),
          this.getValue(
            (element) => element.fillStyle,
            (element) => hasFillStyle(element.type),
            appState.currentItemFillStyle,
          ),
          [
            {
              value: "hachure",
              label: t("labels.hachure"),
              icon: FillHachureIcon,
            },
            {
              value: "cross-hatch",
              label: t("labels.crossHatch"),
              icon: FillCrossHatchIcon,
            },
            { value: "solid", label: t("labels.solid"), icon: FillSolidIcon },
          ] as Option<ExcalidrawElement["fillStyle"]>[],
          (value) => this.execute(actionChangeFillStyle, value),
        ),
      );
    }
    if (applies.sloppiness) {
      properties.push(
        this.property(
          "sloppiness",
          t("labels.sloppiness"),
          this.getValue(
            (element) => element.roughness,
            (element) => element.hasOwnProperty("roughness"),
            appState.currentItemRoughness,
          ),
          [
            {
              value: 0,
              label: t("labels.architect"),
              icon: SloppinessArchitectIcon,
            },
            { value: 1, label: t("labels.artist"), icon: SloppinessArtistIcon },
            {
              value: 2,
              label: t("labels.cartoonist"),
              icon: SloppinessCartoonistIcon,
            },
          ],
          (value) => this.execute(actionChangeSloppiness, value),
        ),
      );
    }
    if (applies.roundness) {
      properties.push(
        this.property(
          "edges",
          t("labels.edges"),
          this.getValue<"sharp" | "round">(
            (element) => (element.roundness ? "round" : "sharp"),
            (element) =>
              !isArrowElement(element) && element.hasOwnProperty("roundness"),
            appState.currentItemRoundness,
          ),
          [
            { value: "sharp", label: t("labels.sharp"), icon: EdgeSharpIcon },
            { value: "round", label: t("labels.round"), icon: EdgeRoundIcon },
          ] as Option<"sharp" | "round">[],
          (value) => this.execute(actionChangeRoundness, value),
        ),
      );
    }
    if (applies.text) {
      properties.push(
        this.property(
          "fontFamily",
          t("labels.fontFamily"),
          this.getValue(
            (element) => this.getText(element)?.fontFamily ?? null,
            this.hasText,
            appState.currentItemFontFamily,
          ),
          DEFAULT_FONTS.map((font) => ({
            value: font.value,
            label: font.text,
            icon: font.icon,
          })),
          (value) =>
            this.execute(actionChangeFontFamily, {
              currentItemFontFamily: value,
              currentHoveredFontFamily: null,
            }),
        ),
        this.property(
          "fontSize",
          t("labels.fontSize"),
          this.getValue(
            this.getFontSize,
            this.hasText,
            appState.currentItemFontSize,
          ),
          [
            {
              value: FONT_SIZES.sm,
              label: t("labels.small"),
              icon: FontSizeSmallIcon,
            },
            {
              value: FONT_SIZES.md,
              label: t("labels.medium"),
              icon: FontSizeMediumIcon,
            },
            {
              value: FONT_SIZES.lg,
              label: t("labels.large"),
              icon: FontSizeLargeIcon,
            },
            {
              value: FONT_SIZES.xl,
              label: t("labels.veryLarge"),
              icon: FontSizeExtraLargeIcon,
            },
          ] as Option<ExcalidrawTextElement["fontSize"]>[],
          (value) => this.execute(actionChangeFontSize, value),
        ),
      );
    }
    if (applies.textAlign) {
      properties.push(
        this.property(
          "textAlign",
          t("labels.textAlign"),
          this.getValue(
            (element) => this.getText(element)?.textAlign ?? null,
            this.hasText,
            appState.currentItemTextAlign,
          ),
          [
            { value: "left", label: t("labels.left"), icon: TextAlignLeftIcon },
            {
              value: "center",
              label: t("labels.center"),
              icon: TextAlignCenterIcon,
            },
            {
              value: "right",
              label: t("labels.right"),
              icon: TextAlignRightIcon,
            },
          ] as Option<ExcalidrawTextElement["textAlign"]>[],
          (value) => this.execute(actionChangeTextAlign, value),
        ),
      );
    }
    if (applies.arrowheads) {
      properties.push(
        this.getArrowheadProperty("start"),
        this.getArrowheadProperty("end"),
      );
    }
    if (applies.arrowType) {
      properties.push(
        this.property(
          "arrowType",
          t("labels.arrowtypes"),
          this.getValue<keyof typeof ARROW_TYPE | null>(
            (element) =>
              isArrowElement(element)
                ? element.elbowed
                  ? ARROW_TYPE.elbow
                  : element.roundness
                  ? ARROW_TYPE.round
                  : ARROW_TYPE.sharp
                : null,
            isArrowElement,
            appState.currentItemArrowType,
          ),
          [
            {
              value: ARROW_TYPE.sharp,
              label: t("labels.arrowtype_sharp"),
              icon: sharpArrowIcon,
            },
            {
              value: ARROW_TYPE.round,
              label: t("labels.arrowtype_round"),
              icon: roundArrowIcon,
            },
            {
              value: ARROW_TYPE.elbow,
              label: t("labels.arrowtype_elbowed"),
              icon: elbowArrowIcon,
            },
          ],
          (value) => this.execute(actionChangeArrowType, value),
        ),
      );
    }
    // the layers apply to elements only
    if (applies.layers && !editsDefaults) {
      const layerActions = [
        [actionSendToBack, t("labels.sendToBack"), SendToBackIcon],
        [actionSendBackward, t("labels.sendBackward"), SendBackwardIcon],
        [actionBringForward, t("labels.bringForward"), BringForwardIcon],
        [actionBringToFront, t("labels.bringToFront"), BringToFrontIcon],
      ] as const;
      properties.push({
        id: "layers",
        label: t("labels.layers"),
        icon: BringForwardIcon,
        subRing: () =>
          layerActions.map(([action, label, icon]) => ({
            id: `layers.${action.name}`,
            label,
            icon,
            run: () => this.execute(action),
          })),
      });
    }
    return properties;
  };

  /** at most 8 slices: if more properties apply, the eighth slice is a
   * "more" slice with the rest */
  protected getMainSlices = (): RingSlice[] => {
    const properties = this.getProperties();
    if (properties.length <= RING_MAX_ITEMS) {
      return properties;
    }
    const rest = properties.slice(RING_MAX_ITEMS - 1);
    return [
      ...properties.slice(0, RING_MAX_ITEMS - 1),
      {
        id: "more",
        label: t("zen.moreProperties"),
        icon: DotsHorizontalIcon,
        subRing: () => rest,
      },
    ];
  };
}
