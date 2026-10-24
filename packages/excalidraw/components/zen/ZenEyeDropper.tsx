import { arrayToMap } from "@excalidraw/common";

import { getColorUpdate, mutateElement, ShapeCache } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import {
  getColorTargetAppStateUpdates,
  resolveColorTarget,
  type ColorDefaultKey,
} from "../../actions/colorTargets";
import { useAtom } from "../../editor-jotai";
import { getSelectedElements } from "../../scene";
import { EyeDropper, activeEyeDropperAtom } from "../EyeDropper";

import type { AppClassProperties, AppState, UIAppState } from "../../types";

/**
 * The eye dropper of the color picker and of the `i`, `shift+s` and
 * `shift+g` keys. The same as in `LayerUI`.
 */
export const ZenEyeDropper = ({
  app,
  appState,
  elements,
  setAppState,
}: {
  app: AppClassProperties;
  appState: UIAppState;
  elements: readonly NonDeletedExcalidrawElement[];
  setAppState: React.Component<any, AppState>["setState"];
}) => {
  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);
  if (!eyeDropperState) {
    return null;
  }
  return (
    <EyeDropper
      colorPickerType={eyeDropperState.colorPickerType}
      onCancel={() => {
        setEyeDropperState(null);
      }}
      onChange={(colorPickerType, color, selectedElements, { altKey }) => {
        if (
          colorPickerType !== "elementBackground" &&
          colorPickerType !== "elementStroke"
        ) {
          return;
        }

        const property =
          altKey && eyeDropperState.swapPreviewOnAlt
            ? colorPickerType === "elementBackground"
              ? "strokeColor"
              : "backgroundColor"
            : colorPickerType === "elementBackground"
            ? "backgroundColor"
            : "strokeColor";

        if (selectedElements.length) {
          const elementsMap = arrayToMap(elements);
          // a note's visible text is its label, so stroke picks include
          // bound labels
          const targets = getSelectedElements(elements, appState, {
            includeBoundTextElement: property === "strokeColor",
          });
          for (const element of targets) {
            mutateElement(
              element,
              elementsMap,
              getColorUpdate(element, property, color, elementsMap),
            );
            ShapeCache.delete(element);
          }
          app.scene.triggerUpdate();
        } else {
          setAppState(
            getColorTargetAppStateUpdates(
              resolveColorTarget(appState, elements, property),
              color,
            ) as Pick<AppState, ColorDefaultKey>,
          );
        }
      }}
      onSelect={(color, event) => {
        setEyeDropperState((state) => {
          return state?.keepOpenOnAlt && event.altKey ? state : null;
        });
        eyeDropperState?.onSelect?.(color, event);
      }}
    />
  );
};
