"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function updateClientFieldsAction(clientId: string, formData: FormData) {
  const nextAction = String(formData.get("nextAction") || "") || null;
  const nextActionDueRaw = String(formData.get("nextActionDue") || "");
  const notes = String(formData.get("notes") || "") || null;
  const status = String(formData.get("status") || "") || undefined;
  const clientType = String(formData.get("clientType") || "") || null;

  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      nextAction,
      nextActionDue: nextActionDueRaw ? new Date(nextActionDueRaw) : null,
      notes,
      clientType,
      ...(status ? { status } : {}),
    },
  });

  await logActivity({
    workspaceId: client.workspaceId,
    recordType: "client",
    recordId: clientId,
    eventType: "client_updated",
    summary: "Client details updated",
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}
