import { describe, it, expect } from "vitest";
import { invoiceBalance, invoiceEffectiveStatus } from "@/lib/billing";
import { addDays } from "@/lib/dates";

describe("Invoice balance", () => {
  it("balance = invoice total - applied payments", () => {
    const invoice = { amount: 1000, payments: [{ amount: 400 }] };
    expect(invoiceBalance(invoice)).toBe(600);
  });

  it("handles a partial payment leaving a remaining balance", () => {
    const invoice = { amount: 1000, payments: [{ amount: 250 }, { amount: 250 }] };
    expect(invoiceBalance(invoice)).toBe(500);
  });

  it("balance is zero when fully paid", () => {
    const invoice = { amount: 1000, payments: [{ amount: 1000 }] };
    expect(invoiceBalance(invoice)).toBe(0);
  });

  it("balance is zero (not negative) reporting-wise when overpaid, but function returns the raw signed value", () => {
    const invoice = { amount: 1000, payments: [{ amount: 1200 }] };
    expect(invoiceBalance(invoice)).toBe(-200);
  });
});

describe("Invoice effective status", () => {
  it("is Overdue when balance remains past the due date", () => {
    const invoice = { status: "Sent", amount: 1000, dueDate: addDays(new Date(), -5), payments: [] };
    expect(invoiceEffectiveStatus(invoice)).toBe("Overdue");
  });

  it("is Paid once the balance reaches zero, even if status field still says Sent", () => {
    const invoice = { status: "Sent", amount: 1000, dueDate: addDays(new Date(), 5), payments: [{ amount: 1000 }] };
    expect(invoiceEffectiveStatus(invoice)).toBe("Paid");
  });

  it("is Partially Paid when some but not all has been paid and not yet due", () => {
    const invoice = { status: "Sent", amount: 1000, dueDate: addDays(new Date(), 5), payments: [{ amount: 300 }] };
    expect(invoiceEffectiveStatus(invoice)).toBe("Partially Paid");
  });

  it("Draft and Cancelled statuses are never overridden by balance/due date", () => {
    const draft = { status: "Draft", amount: 1000, dueDate: addDays(new Date(), -5), payments: [] };
    expect(invoiceEffectiveStatus(draft)).toBe("Draft");

    const cancelled = { status: "Cancelled", amount: 1000, dueDate: addDays(new Date(), -5), payments: [] };
    expect(invoiceEffectiveStatus(cancelled)).toBe("Cancelled");
  });
});
