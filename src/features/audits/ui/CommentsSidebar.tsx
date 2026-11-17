"use client";

import React, { useEffect, useRef, useState } from "react";
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
  // Los hooks deben ejecutarse siempre en el mismo orden: el corte por
  // "sin selección" va después de declararlos, no antes.
  const [value, setValue] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const postingRef = useRef(false);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const { mutateAsync: createComment, isPending: isCreating } =
    useCreateAuditCommentMutation();
  const { mutateAsync: updateComment, isPending: isUpdating } =
    useUpdateAuditCommentMutation();
  const { data: fetchedComments, isLoading: isFetching, isError: commentsError, refetch } = useAuditComments(
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
    setSaveError(null);
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

  const isSaving = isCreating || isUpdating || posting;
  const isBusy = isFetching || isSaving;

  const handlePost = async () => {
    if (!selected || postingRef.current) return;
    const text = value.trim();
    if (!text) return;
    postingRef.current = true;
    setPosting(true);
    setSaveError(null);
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
      setSaveError("Comment could not be saved. Your message is preserved; please try again.");
    } finally {
      postingRef.current = false;
      setPosting(false);
    }
  };

  const handleStartEdit = (comment: LocalComment) => {
    setEditingId(comment.id);
    setValue(comment.text);
  };

  if (!selected) return null;

  return (
    <aside
      className={cn(
        "w-full shrink-0 border-t border-[var(--kma-border)] bg-[var(--kma-surface)] lg:sticky lg:top-[76px] lg:max-h-[75vh] lg:overflow-y-auto lg:border-l lg:border-t-0",
        className
      )}
      aria-label="Comments Panel"
    >
      {/* Header con botón chico a la derecha */}
      <header className="sticky top-0 grid grid-cols-[1fr_auto] items-center gap-2 border-b border-[var(--kma-border)] bg-[var(--kma-surface)] px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold leading-none">Comments</h2>
        <div className="justify-self-end">
          <Button
            type="button"
            onClick={onClose}
            aria-label="Close comments panel"
            title="Close"
            variant="ghost"
            fullWidth={false}
            className={cn(
              "h-11 w-11 rounded p-0",
              "hover:bg-[var(--kma-input)] focus-visible:ring-2 focus-visible:ring-[var(--kma-ring)]/30"
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-5">
        <p className="mb-4 border-b border-[var(--kma-border)] pb-4 break-words text-sm font-medium text-[var(--kma-fg)]">{selected.title}</p>
        {/* Lista de comentarios */}
        <div>
          {commentsError ? (
            <div className="space-y-3 rounded bg-[var(--kma-danger-bg)] p-3">
              <p role="alert" className="text-sm text-[var(--kma-danger)]">Comments could not be loaded. Please try again.</p>
              <Button fullWidth={false} onClick={() => void refetch()}>Retry comments</Button>
            </div>
          ) : isFetching ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <MessageSquare className="h-8 w-8 animate-pulse text-[var(--kma-muted)]/60" />
              <p className="max-w-[24ch] text-sm text-[var(--kma-muted)]">
                Loading comments…
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-[var(--kma-muted)]/60" />
              <p className="max-w-[24ch] text-sm text-[var(--kma-muted)]">
                No comments yet. Start the discussion below.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="border-b border-[var(--kma-border)] py-3"
                >
                  {/* fila superior: fecha + botón editar (compacto) */}
                  <div className="mb-1 flex items-center justify-between text-xs text-[var(--kma-muted)]">
                    <span>{new Date(c.createdAt).toLocaleString()}</span>

                    <RowActionButton
                      icon={Pencil}
                      ariaLabel="Edit comment"
                      onClick={() => handleStartEdit(c)}
                      size="md"
                    />
                  </div>

                  <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor simple */}
        <div className="mt-6 space-y-2 border-t border-[var(--kma-border)] pt-4">
          {saveError && <p role="alert" className="text-sm text-[var(--kma-danger)]">{saveError}</p>}
          <label
            htmlFor="new-comment"
            className="text-xs font-medium text-[var(--kma-muted)]"
          >
            Add a comment
          </label>
          <textarea
            id="new-comment"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className={cn(
              "w-full resize-y rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kma-ring)]/30"
            )}
            placeholder="Write your comment…"
            disabled={isBusy}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth={false}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              fullWidth={false}
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
