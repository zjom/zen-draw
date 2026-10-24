import { Popover } from "radix-ui";
import { useEffect, useRef } from "react";

import { getColorTargetElement } from "@excalidraw/element";

import { getFormValue } from "../../actions/actionProperties";
import { resolveColorTarget } from "../../actions/colorTargets";
import { t } from "../../i18n";
import { ColorPickerPopupContent } from "../ColorPicker/ColorPicker";

import type { AppClassProperties, UIAppState } from "../../types";
import type { StyleRingColorPickerType } from "../App.styleRing";

/**
 * The color picker of the style ring, at the anchor of the style ring (the
 * color slice), or at the pointer for the `s` and `g` keys. It is open
 * while `appState.openPopup` is the type of the picker.
 */
export const StyleRingColorPicker = ({
  app,
  appState,
  type,
}: {
  app: AppClassProperties;
  appState: UIAppState;
  type: StyleRingColorPickerType;
}) => {
  const openPopupRef = useRef(appState.openPopup);
  useEffect(() => {
    openPopupRef.current = appState.openPopup;
  }, [appState.openPopup]);
  useEffect(() => () => app.styleRing.onColorPickerClose(), [app]);

  const elements = app.scene.getElementsIncludingDeleted();
  const elementsMap = app.scene.getNonDeletedElementsMap();
  const property = type === "elementStroke" ? "strokeColor" : "backgroundColor";
  const target = resolveColorTarget(appState, elements, property);
  const label =
    type === "elementBackground"
      ? t("labels.background")
      : target.kind === "sticky"
      ? t("labels.textColor")
      : t("labels.stroke");
  const updateData = (data?: any) => app.styleRing.updateColor(type, data);

  const anchor = app.styleRing.getColorPickerAnchor();

  return (
    <Popover.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          updateData({ openPopup: null });
        }
      }}
    >
      <Popover.Anchor asChild>
        <div
          className="StyleRingColorPicker__anchor"
          style={{
            left: anchor.x - appState.offsetLeft,
            top: anchor.y - appState.offsetTop,
          }}
        />
      </Popover.Anchor>
      <ColorPickerPopupContent
        type={type}
        label={label}
        color={getFormValue(
          elements,
          app,
          (element) =>
            property === "strokeColor"
              ? element.strokeColor
              : getColorTargetElement(element, "backgroundColor", elementsMap)
                  .backgroundColor,
          true,
          (hasSelection) => (!hasSelection ? target.currentValue : null),
        )}
        onChange={(color) => updateData({ color })}
        elements={elements}
        palette={target.palette}
        excludedColors={target.excludedColors}
        updateData={updateData}
        getOpenPopup={() => openPopupRef.current}
        appState={appState}
      />
    </Popover.Root>
  );
};
