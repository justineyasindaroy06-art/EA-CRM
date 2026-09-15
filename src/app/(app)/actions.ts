"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";
import { setCurrentWorkspaceId } from "@/lib/workspace";

export async function setWorkspaceAction(workspaceId: string | null) {
  await setCurrentWorkspaceId(workspaceId);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
