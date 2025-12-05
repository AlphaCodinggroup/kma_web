"use client";

import * as React from "react";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button } from "@shared/ui/controls";

import Link from "next/link";

export interface FlowCardProps {
  title: string;
  description?: string;
  questionsCount: number;
  className?: string;
  onViewQuestions?: () => void;
  "data-testid"?: string;
  flowId: string;
}

export const FlowCard: React.FC<FlowCardProps> = ({
  title,
  description,
  questionsCount,
  className,
  onViewQuestions,
  "data-testid": dataTestId,
  flowId,
}) => {
  return (
    <Card
      data-testid={dataTestId}
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border bg-white",
        "shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
        "flex flex-col",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="relative">
          <CardTitle className="pr-10 text-xl font-bold leading-7 text-foreground">
            {title}
          </CardTitle>

          <Link
            href={`/flows/${flowId}` as any}
            aria-label="Edit flow"
            className={cn(
              "absolute right-0 top-0 inline-flex h-6 w-6 items-center justify-center",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pencil className="h-5 w-5 cursor-pointer" stroke="#6a7282" />
          </Link>
        </div>

        {description ? (
          <p className="mt-4 text-base text-muted-foreground  text-gray-500">
            {description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex h-full flex-col pt-3">
        <div className="flex-1" />
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-medium text-muted-foreground text-gray-500">
            Questions
          </span>

          <span
            className={cn(
              "inline-flex min-w-[2.25rem] items-center justify-center",
              "rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground bg-gray-100"
            )}
          >
            {questionsCount}
          </span>
        </div>
        <Button
          type="button"
          onClick={onViewQuestions}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2",
            "rounded-xl border border-gray-300 bg-white",
            "transition-colors hover:bg-gray-100",
            "focus-visible:ring-2 focus-visible:ring-ring/30"
          )}
        >
          <Eye className="h-5 w-5" stroke="black" />
          <span className="text-black">View Questions</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default FlowCard;
