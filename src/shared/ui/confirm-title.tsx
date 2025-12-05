"use client";

import React from "react";
import { cn } from "@shared/lib/cn";

export interface ConfirmTitleProps {
  action: string;
  subject: React.ReactNode;
  quoted?: boolean;
  className?: string;
  subjectClassName?: string;
}

const ConfirmTitle: React.FC<ConfirmTitleProps> = ({
  action,
  subject,
  quoted = true,
  className,
  subjectClassName,
}) => {
  return (
    <span className={cn(className)}>
      Do you want to {action}{" "}
      <span className={cn("font-bold", subjectClassName)}>
        {quoted ? <>“{subject}”</> : <>{subject}</>}
      </span>
      ?
    </span>
  );
};
export default ConfirmTitle;
