import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@processes/auth/session";

export default async function FlowsLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session.authenticated) redirect("/login");
  const role = session.user?.role.toLowerCase();
  if (role !== "admin" && role !== "administrator") notFound();
  return children;
}
