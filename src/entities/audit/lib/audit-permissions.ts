import type { User } from "@entities/user/model/sessions";

export function canReviewAudit(
  isAdmin: boolean,
  user: Pick<User, "id" | "role"> | null | undefined,
  createdBy: string | null | undefined,
): boolean {
  return isAdmin || Boolean(
    user?.role.toLowerCase() === "auditor" && user.id && createdBy && user.id === createdBy,
  );
}
