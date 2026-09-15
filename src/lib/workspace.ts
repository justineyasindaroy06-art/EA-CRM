import { cookies } from "next/headers";
import { prisma } from "./prisma";

const WORKSPACE_COOKIE = "ea_crm_workspace";

/**
 * Returns the currently selected workspace id, or null for "All Clients".
 * Persisted in a cookie so the selection survives navigation.
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (!value || value === "all") return null;
  return value;
}

export async function setCurrentWorkspaceId(id: string | null) {
  const cookieStore = await cookies();
  if (!id) {
    cookieStore.set(WORKSPACE_COOKIE, "all", { path: "/" });
  } else {
    cookieStore.set(WORKSPACE_COOKIE, id, { path: "/" });
  }
}

export async function getAllWorkspaces() {
  return prisma.workspace.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Builds a Prisma `where` fragment that scopes a query to the current
 * workspace selection. Pass null/undefined workspaceId to mean "All Clients".
 * Every list/detail query in the app MUST go through this so client data
 * never mixes across workspaces (spec section 5, 28).
 */
export function workspaceScope(workspaceId: string | null) {
  return workspaceId ? { workspaceId } : {};
}
