"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@shared/ui/card";
import ActivityItem from "./ActivityItem";

export type Activity = {
  project: string;
  auditor: string;
  time: string;
  variant: "success" | "warning" | "info" | "danger" | "neutral";
};

type DashboardActivitySectionProps = {
  title?: string;
  subtitle?: string;
  items: Activity[];
  "data-testid"?: string;
};

const DashboardActivitySection: React.FC<DashboardActivitySectionProps> = ({
  title = "Recent Activity",
  subtitle = "Latest audits completed by auditors",
  items,
  "data-testid": testId,
}) => {
  const isEmpty = !items || items.length === 0;

  return (
    <Card
      data-testid={testId}
      className="rounded-2xl border-gray-200 bg-white shadow-sm"
    >
      <CardHeader className="pb-0">
        <CardTitle className="text-md font-extrabold">{title}</CardTitle>
        <CardDescription className="text-xs text-gray-600 mt-1">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-5">
        {isEmpty ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 py-10">
            <p className="text-sm text-gray-600">No recent activity</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((it, idx) => (
              <ActivityItem
                key={`${it.project}-${idx}`}
                project={it.project}
                auditor={it.auditor}
                time={it.time}
                variant={it.variant}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardActivitySection;
