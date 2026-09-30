"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProjectDetailView from "@widgets/project-detail/ProjectDetailView";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  return <ProjectDetailView projectId={id} />;
}
