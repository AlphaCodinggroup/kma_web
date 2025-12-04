"use client";

import React from "react";
import ProjectUpsertDialog, {
  type Option,
  type ProjectUpsertValues,
} from "./ProjectsUpsertDialog";
import type { Project } from "@entities/projects/model";
import type { UserSummary } from "@entities/user/list.model";

export interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  auditors: UserSummary[];
  facilities: Option[];
  onSubmit: (
    values: ProjectUpsertValues & { id: string }
  ) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  titleOverride?: string;
  descriptionOverride?: string;
  submitLabelOverride?: string;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
  auditors,
  facilities,
  onSubmit,
  loading,
  error,
  titleOverride,
  descriptionOverride,
  submitLabelOverride,
}) => {
  const defaults: Partial<ProjectUpsertValues> = {
    name: project.name,
    description: project.description ?? "",
    auditorIds: project.users?.map((u) => u.id) ?? [],
    facilityIds: project.facilities?.map((f) => f.id) ?? [],
  };

  return (
    <ProjectUpsertDialog
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={defaults}
      auditors={auditors}
      facilities={facilities}
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
