"use client";

import React from "react";
import ProjectUpsertDialog, {
  type Option,
  type ProjectUpsertValues,
} from "./ProjectsUpsertDialog";

export interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    auditorId?: string | null | undefined;
    buildingId?: string | null | undefined;
  };
  auditors: Option[];
  buildings: Option[];
  onSubmit: (
    values: ProjectUpsertValues & { id: string }
  ) => void | Promise<void>;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  titleOverride?: string | undefined;
  descriptionOverride?: string | undefined;
  submitLabelOverride?: string | undefined;
}

/**
 * Wrapper fino que fija `mode="edit"` y provee `defaultValues` desde `project`.
 */
const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
  auditors,
  buildings,
  onSubmit,
  loading,
  error,
  titleOverride,
  descriptionOverride,
  submitLabelOverride,
}) => {
  const defaults: Partial<ProjectUpsertValues> = {
    name: project.name,
    auditorId: project.auditorId ?? undefined,
    buildingId: project.buildingId ?? undefined,
  };

  return (
    <ProjectUpsertDialog
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={defaults}
      auditors={auditors}
      buildings={buildings}
      loading={loading}
      error={error}
      titleOverride={titleOverride}
      descriptionOverride={descriptionOverride}
      submitLabelOverride={submitLabelOverride}
      onSubmit={async (values) => {
        await onSubmit({ ...values, id: project.id });
      }}
    />
  );
};

export default EditProjectDialog;
