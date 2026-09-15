interface InvoiceWithPayments {
  amount: number;
  payments: { amount: number }[];
}

/** Balance = Invoice Total - Applied Payments (spec section 21). */
export function invoiceBalance(invoice: InvoiceWithPayments): number {
  const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.round((invoice.amount - paid) * 100) / 100;
}

export function invoiceEffectiveStatus(invoice: {
  status: string;
  dueDate: Date;
  amount: number;
  payments: { amount: number }[];
}): string {
  if (invoice.status === "Cancelled" || invoice.status === "Draft") return invoice.status;

  const balance = invoiceBalance(invoice);
  if (balance <= 0) return "Paid";

  const paid = invoice.amount - balance;
  const isOverdue = invoice.dueDate.getTime() < Date.now();

  if (isOverdue) return "Overdue";
  if (paid > 0) return "Partially Paid";
  return invoice.status === "Sent" ? "Sent" : invoice.status;
}
