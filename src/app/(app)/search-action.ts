"use server";

import { globalSearch } from "@/lib/search";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export async function searchAction(query: string) {
  const workspaceId = await getCurrentWorkspaceId();
  return globalSearch(query, workspaceId);
}
