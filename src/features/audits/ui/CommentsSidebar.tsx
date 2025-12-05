"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";
import { MessageSquare, X, Trash2 } from "lucide-react";
import { Button } from "@shared/ui/controls";
import RowActionButton from "@shared/ui/row-action-button";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";

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
  onClose: () => void;
  className?: string;
  isLoading: boolean;
  isError: boolean;
  onError: () => void; // usado como handler de "Retry"
}

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  selected,
  onClose,
  className,
  isLoading,
  isError,
  onError,
}) => {
  if (!selected) return null;

  const [value, setValue] = React.useState<string>("");
  const [comments, setComments] = React.useState<LocalComment[]>([]);

  React.useEffect(() => {
    setValue("");
    setComments([]);
  }, [selected?.id]);

  const handlePost = () => {
    const text = value.trim();
    if (!text) return;

    const newComment: LocalComment = {
      id: `${selected!.id}-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [newComment, ...prev]);
    setValue("");
  };

  const handleDelete = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
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
        {/* Lista de comentarios / estados de carga / error */}
        <div>
          {isLoading ? (
            <Loading text="Loading comments…" />
          ) : isError ? (
            <Retry
              text="Failed to load comments. Please try again."
              textButton="Retry"
              onClick={onError}
            />
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
                  {/* fila superior: fecha + botón eliminar (compacto) */}
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(c.createdAt).toLocaleString()}</span>

                    <RowActionButton
                      icon={Trash2}
                      ariaLabel="Delete comment"
                      onClick={() => handleDelete(c.id)}
                      variant="danger"
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
              disabled={!value.trim()}
              aria-disabled={!value.trim()}
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
