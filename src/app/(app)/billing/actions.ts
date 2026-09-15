"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { invoiceSchema, paymentSchema } from "@/lib/validations";
import { sendAutomationEmail } from "@/lib/integrations/email";

export async function createInvoiceAction(formData: FormData) {
  const parsed = invoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    packageId: formData.get("packageId") || null,
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
    dueDate: formData.get("dueDate"),
    amount: formData.get("amount"),
    status: formData.get("status") || "Draft",
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const client = await prisma.client.findUniqueOrThrow({ where: { id: parsed.data.clientId }, include: { contact: true } });

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: client.workspaceId,
      clientId: parsed.data.clientId,
      packageId: parsed.data.packageId || null,
      invoiceNumber: parsed.data.invoiceNumber,
      invoiceDate: new Date(parsed.data.invoiceDate),
      dueDate: new Date(parsed.data.dueDate),
      amount: parsed.data.amount,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    },
  });

  await logActivity({
    workspaceId: client.workspaceId,
    recordType: "invoice",
    recordId: invoice.id,
    eventType: "invoice_created",
    summary: `Invoice ${invoice.invoiceNumber} created ($${invoice.amount})`,
  });

  if (parsed.data.status === "Sent") {
    await sendAutomationEmail({
      workspaceId: client.workspaceId,
      templateKey: "invoice_sent",
      to: client.contact.email,
      variables: {
        first_name: client.contact.firstName,
        invoice_number: invoice.invoiceNumber,
        amount: invoice.amount.toFixed(2),
        due_date: invoice.dueDate.toDateString(),
      },
      relatedRecordType: "invoice",
      relatedRecordId: invoice.id,
    });
    await logActivity({
      workspaceId: client.workspaceId,
      recordType: "invoice",
      recordId: invoice.id,
      eventType: "invoice_sent",
      summary: `Invoice ${invoice.invoiceNumber} sent to client`,
    });
  }

  revalidatePath("/billing");
}

export async function recordPaymentAction(formData: FormData) {
  const parsed = paymentSchema.safeParse({
    invoiceId: formData.get("invoiceId") || null,
    clientId: formData.get("clientId"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod") || null,
    referenceNumber: formData.get("referenceNumber") || null,
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const client = await prisma.client.findUniqueOrThrow({ where: { id: parsed.data.clientId } });

  const payment = await prisma.payment.create({
    data: {
      workspaceId: client.workspaceId,
      invoiceId: parsed.data.invoiceId || null,
      clientId: parsed.data.clientId,
      amount: parsed.data.amount,
      paymentDate: new Date(parsed.data.paymentDate),
      paymentMethod: parsed.data.paymentMethod || null,
      referenceNumber: parsed.data.referenceNumber || null,
      notes: parsed.data.notes || null,
    },
  });

  if (parsed.data.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      include: { payments: true },
    });
    if (invoice) {
      const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0) + parsed.data.amount;
      const newStatus = totalPaid >= invoice.amount ? "Paid" : "Partially Paid";
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });
    }
  }

  await logActivity({
    workspaceId: client.workspaceId,
    recordType: "payment",
    recordId: payment.id,
    eventType: "payment_recorded",
    summary: `Payment of $${payment.amount} recorded`,
  });

  revalidatePath("/billing");
}

export async function markInvoiceSentAction(invoiceId: string) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "Sent" },
    include: { client: { include: { contact: true } } },
  });

  await sendAutomationEmail({
    workspaceId: invoice.workspaceId,
    templateKey: "invoice_sent",
    to: invoice.client.contact.email,
    variables: {
      first_name: invoice.client.contact.firstName,
      invoice_number: invoice.invoiceNumber,
      amount: invoice.amount.toFixed(2),
      due_date: invoice.dueDate.toDateString(),
    },
    relatedRecordType: "invoice",
    relatedRecordId: invoice.id,
  });

  await logActivity({
    workspaceId: invoice.workspaceId,
    recordType: "invoice",
    recordId: invoiceId,
    eventType: "invoice_sent",
    summary: `Invoice ${invoice.invoiceNumber} sent to client`,
  });

  revalidatePath("/billing");
}

export async function createPackageAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!workspaceId || !name) throw new Error("Workspace and name are required");

  await prisma.package.create({
    data: {
      workspaceId,
      name,
      description: String(formData.get("description") || "") || null,
      price: Number(formData.get("price") || 0),
      duration: String(formData.get("duration") || "") || null,
      packageType: String(formData.get("packageType") || "") || null,
    },
  });

  revalidatePath("/billing");
}
