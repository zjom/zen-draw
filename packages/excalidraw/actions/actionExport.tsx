import { THEME } from "@excalidraw/common";

import { CaptureUpdateAction } from "@excalidraw/element";

import type { Theme } from "@excalidraw/element/types";

import { CheckboxItem } from "../components/CheckboxItem";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { ProjectName } from "../components/ProjectName";
import { Tooltip } from "../components/Tooltip";
import { questionCircle } from "../components/icons";

import { t } from "../i18n";

import "../components/ToolIcon.scss";

import { register } from "./register";

import type { AppState } from "../types";

export const actionChangeProjectName = register<AppState["name"]>({
  name: "changeProjectName",
  label: "labels.fileTitle",
  trackEvent: false,
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, name: value },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ appState, updateData, appProps, data, app }) => (
    <ProjectName
      label={t("labels.fileTitle")}
      value={app.getName()}
      onChange={(name: string) => updateData(name)}
      ignoreFocus={data?.ignoreFocus ?? false}
    />
  ),
});

export const actionChangeExportScale = register<AppState["exportScale"]>({
  name: "changeExportScale",
  label: "imageExportDialog.scale",
  trackEvent: { category: "export", action: "scale" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportScale: value },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
});

export const actionChangeExportBackground = register<
  AppState["exportBackground"]
>({
  name: "changeExportBackground",
  label: "imageExportDialog.label.withBackground",
  trackEvent: { category: "export", action: "toggleBackground" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportBackground: value },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportBackground}
      onChange={(checked) => updateData(checked)}
    >
      {t("imageExportDialog.label.withBackground")}
    </CheckboxItem>
  ),
});

export const actionChangeExportEmbedScene = register<
  AppState["exportEmbedScene"]
>({
  name: "changeExportEmbedScene",
  label: "imageExportDialog.tooltip.embedScene",
  trackEvent: { category: "export", action: "embedScene" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportEmbedScene: value },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportEmbedScene}
      onChange={(checked) => updateData(checked)}
    >
      {t("imageExportDialog.label.embedScene")}
      <Tooltip label={t("imageExportDialog.tooltip.embedScene")} long={true}>
        <div className="excalidraw-tooltip-icon">{questionCircle}</div>
      </Tooltip>
    </CheckboxItem>
  ),
});

export const actionExportWithDarkMode = register<
  AppState["exportWithDarkMode"]
>({
  name: "exportWithDarkMode",
  label: "imageExportDialog.label.darkMode",
  trackEvent: { category: "export", action: "toggleTheme" },
  perform: (_elements, appState, value, app) => {
    app.sessionExportThemeOverride = value ? THEME.DARK : THEME.LIGHT;
    return {
      appState: { ...appState, exportWithDarkMode: value },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "-45px",
        marginBottom: "10px",
      }}
    >
      <DarkModeToggle
        value={appState.exportWithDarkMode ? THEME.DARK : THEME.LIGHT}
        onChange={(theme: Theme) => {
          updateData(theme === THEME.DARK);
        }}
        title={t("imageExportDialog.label.darkMode")}
      />
    </div>
  ),
});
