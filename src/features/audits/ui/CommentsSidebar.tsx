"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@shared/lib/cn";
import { MessageSquare, X, Pencil } from "lucide-react";
import { Button } from "@shared/ui/controls";
import RowActionButton from "@shared/ui/row-action-button";
import { useCreateAuditCommentMutation } from "../lib/hooks/useCreateAuditCommentMutation";
import { useUpdateAuditCommentMutation } from "../lib/hooks/useUpdateAuditCommentMutation";
import { useAuditComments } from "../lib/hooks/useAuditComments";

export interface CommentTarget {
  id: string;
  title: string;
}

type LocalComment = {
  id: string;
  text: string;
  createdAt: string; // ISO
};

export interface CommentsSidebarProps {
  selected?: CommentTarget | undefined;
  auditId: string;
  onClose?: (() => void) | undefined;
  className?: string;
}

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  selected,
  auditId,
  onClose,
  className,
}) => {
  if (!selected) return null;

  const [value, setValue] = useState<string>("");
  const [comments, setComments] = useState<LocalComment[]>([]);
  const { mutateAsync: createComment, isPending: isCreating } =
    useCreateAuditCommentMutation();
  const { mutateAsync: updateComment, isPending: isUpdating } =
    useUpdateAuditCommentMutation();
  const { data: fetchedComments, isLoading: isFetching } = useAuditComments(
    auditId,
    {
      enabled: Boolean(selected),
    }
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setValue("");
    setComments([]);
    setEditingId(null);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    if (fetchedComments?.comments) {
      const filtered = fetchedComments.comments
        .filter((c) => c.stepId === selected.id)
        .map((c) => ({
          id: c.id,
          text: c.content,
          createdAt: c.updatedAt || c.createdAt,
        }));
      setComments(filtered);
    }
  }, [fetchedComments?.comments, selected]);

  const isSaving = isCreating || isUpdating;
  const isBusy = isFetching || isSaving;

  const handlePost = async () => {
    if (!selected) return;
    const text = value.trim();
    if (!text) return;
    try {
      if (editingId) {
        const updated = await updateComment({
          commentId: editingId,
          auditId,
          stepId: selected.id,
          content: text,
        });

        setComments((prev) =>
          prev.map((c) =>
            c.id === updated.id
              ? { ...c, text: updated.content, createdAt: updated.updatedAt }
              : c
          )
        );
      } else {
        const created = await createComment({
          auditId,
          stepId: selected.id,
          content: text,
        });

        const newComment: LocalComment = {
          id: created.id,
          text: created.content,
          createdAt: created.createdAt,
        };
        setComments((prev) => [newComment, ...prev]);
      }
      setValue("");
      setEditingId(null);
    } catch (err) {
      console.error("[CommentsSidebar] Error saving comment", err);
    }
  };

  const handleStartEdit = (comment: LocalComment) => {
    setEditingId(comment.id);
    setValue(comment.text);
  };

  return (
    <aside
      className={cn(
        "w-full max-w-md shrink-0 rounded-2xl border border-gray-200 bg-gray-50 shadow-sm md:sticky md:top-4",
        className
      )}
      aria-label="Comments Panel"
    >
      {/* Header con botón chico a la derecha */}
      <header className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-b-gray-200 px-4 py-3 sm:px-5">
        <h3 className="text-base font-bold leading-none">Comments</h3>
        <div className="justify-self-end">
          <Button
            type="button"
            onClick={onClose}
            aria-label="Close comments panel"
            title="Close"
            className={cn(
              "h-8 w-8 rounded-lg border bg-background p-0",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-5">
        {/* Lista de comentarios */}
        <div>
          {isFetching ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <MessageSquare className="h-8 w-8 animate-pulse text-muted-foreground/60" />
              <p className="max-w-[24ch] text-sm text-muted-foreground">
                Loading comments…
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/60" />
              <p className="max-w-[24ch] text-sm text-muted-foreground">
                No comments yet. Start the discussion below.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  {/* fila superior: fecha + botón editar (compacto) */}
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(c.createdAt).toLocaleString()}</span>

                    <RowActionButton
                      icon={Pencil}
                      ariaLabel="Edit comment"
                      onClick={() => handleStartEdit(c)}
                      size="md"
                    />
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor simple */}
        <div className="mt-4 space-y-2">
          <label
            htmlFor="new-comment"
            className="text-xs font-medium text-muted-foreground"
          >
            Add a comment
          </label>
          <textarea
            id="new-comment"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className={cn(
              "w-full resize-none rounded-xl border bg-background/60 px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            )}
            placeholder="Write your comment…"
            disabled={isBusy}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              className="h-8 rounded-lg border bg-background px-3 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-8 rounded-lg px-3 text-xs"
              disabled={!value.trim() || isBusy}
              aria-disabled={!value.trim() || isBusy}
              onClick={handlePost}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CommentsSidebar;
