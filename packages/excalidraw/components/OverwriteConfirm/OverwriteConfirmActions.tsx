import React from "react";

import { actionChangeExportEmbedScene } from "../../actions/actionExport";
import { useI18n } from "../../i18n";
import { useExcalidrawActionManager, useExcalidrawSetAppState } from "../App";
import { FilledButton } from "../FilledButton";

export type ActionProps = {
  title: string;
  children: React.ReactNode;
  actionLabel: string;
  onClick: () => void;
};

export const Action = ({
  title,
  children,
  actionLabel,
  onClick,
}: ActionProps) => {
  return (
    <div className="OverwriteConfirm__Actions__Action">
      <h4>{title}</h4>
      <div className="OverwriteConfirm__Actions__Action__content">
        {children}
      </div>
      <FilledButton
        variant="outlined"
        color="muted"
        label={actionLabel}
        size="large"
        fullWidth
        onClick={onClick}
      />
    </div>
  );
};

export const ExportToImage = () => {
  const { t } = useI18n();
  const actionManager = useExcalidrawActionManager();
  const setAppState = useExcalidrawSetAppState();

  return (
    <Action
      title={t("overwriteConfirm.action.exportToImage.title")}
      actionLabel={t("overwriteConfirm.action.exportToImage.button")}
      onClick={() => {
        actionManager.executeAction(actionChangeExportEmbedScene, "ui", true);
        setAppState({ openDialog: { name: "imageExport" } });
      }}
    >
      {t("overwriteConfirm.action.exportToImage.description")}
    </Action>
  );
};

const Actions = Object.assign(
  ({ children }: { children: React.ReactNode }) => {
    return <div className="OverwriteConfirm__Actions">{children}</div>;
  },
  {
    ExportToImage,
  },
);

export { Actions };
