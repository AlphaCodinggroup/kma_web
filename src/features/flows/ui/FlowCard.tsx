"use client";

import * as React from "react";
import { Eye, Pencil, Loader2, Trash2 } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button } from "@shared/ui/controls";
import { Loading } from "@shared/ui/Loading";
import Link from "next/link";
import { useSession } from "@processes/auth/hooks";

export interface FlowCardProps {
  title: string;
  description?: string;
  className?: string;
  onViewQuestions?: () => void;
  "data-testid"?: string;
  flowId: string;
  onDeleted?: () => void;
}

export const FlowCard: React.FC<FlowCardProps> = ({
  title,
  description,
  className,
  onViewQuestions,
  "data-testid": dataTestId,
  flowId,
  onDeleted,
}) => {
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { isAdmin } = useSession();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this flow? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      // Import dynamic to avoid circular dependencies if any, or just use global flowsRepo if available. 
      // Since flowsRepo is in src/features/flows/api/flows.repo.impl, we can import it.
      // But wait, FlowCard is UI component, it strictly shouldn't dep on infrastructure normally.
      // However, user asked "que hace la request para el delete". 
      // I'll assume we can use the repo here or fetch directly. Using repo is cleaner.
      // I need to add import { flowsRepo } ...
      const { flowsRepo } = await import("@features/flows/api/flows.repo.impl");
      await flowsRepo.delete(flowId);
      setIsDeleting(false);
      if (onDeleted) onDeleted();
      else window.location.reload(); // Fallback
    } catch (error) {
      console.error("Failed to delete flow", error);
      alert("Failed to delete flow");
      setIsDeleting(false);
    }
  };

  if (isNavigating) {
    return <Loading text="Navigating to flow..." />;
  }

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

          <div className="absolute right-0 top-0 flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting || !isAdmin}
              className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isAdmin ? "Only administrators can delete flows" : "Delete flow"}
            >
              {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
            </button>

            {isAdmin ? (
              <Link
                href={`/flows/${flowId}` as any}
                aria-label="Edit flow"
                onClick={() => setIsNavigating(true)}
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                {isNavigating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Pencil className="h-5 w-5 cursor-pointer" stroke="#6a7282" />
                )}
              </Link>
            ) : (
              <div
                className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground opacity-50 cursor-not-allowed"
                title="Only administrators can edit flows"
              >
                <Pencil className="h-5 w-5" stroke="#6a7282" />
              </div>
            )}
          </div>
        </div>

        {description ? (
          <p className="mt-4 text-base text-muted-foreground  text-gray-500">
            {description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex h-full flex-col pt-3">
        <div className="flex-1" />

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
