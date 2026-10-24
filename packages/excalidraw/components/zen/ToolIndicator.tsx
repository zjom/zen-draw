import { t } from "../../i18n";
import { LockedIcon } from "../icons";
import { TOOLS } from "../Tools";

import type { UIAppState } from "../../types";

/** a small icon of the active tool in a corner of the canvas */
export const ToolIndicator = ({ appState }: { appState: UIAppState }) => {
  const { activeTool } = appState;
  const tool =
    activeTool.type in TOOLS
      ? TOOLS[activeTool.type as keyof typeof TOOLS]
      : null;
  if (!tool) {
    return null;
  }
  return (
    <div
      className="ToolIndicator"
      data-testid="tool-indicator"
      data-tool={activeTool.type}
      aria-label={`${t("zen.activeTool")}: ${t(
        `toolBar.${activeTool.type as keyof typeof TOOLS}`,
      )}`}
    >
      {tool.icon}
      {activeTool.locked && (
        <span className="ToolIndicator__lock">{LockedIcon}</span>
      )}
    </div>
  );
};
