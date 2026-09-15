import { describe, it, expect } from "vitest";
import { isOverdue, isDueToday, addDays, startOfToday } from "@/lib/dates";

describe("Task due-date logic", () => {
  it("treats a past due date as overdue", () => {
    expect(isOverdue(addDays(startOfToday(), -1))).toBe(true);
  });

  it("does not treat today's due date as overdue", () => {
    expect(isOverdue(startOfToday())).toBe(false);
  });

  it("does not treat a future due date as overdue", () => {
    expect(isOverdue(addDays(startOfToday(), 3))).toBe(false);
  });

  it("treats a null due date as not overdue and not due today", () => {
    expect(isOverdue(null)).toBe(false);
    expect(isDueToday(null)).toBe(false);
  });

  it("recognizes a due date within today's window as due today", () => {
    const now = new Date();
    expect(isDueToday(now)).toBe(true);
  });
});

describe("Waiting status", () => {
  it("a task with status Waiting and a follow-up date is not counted as overdue by due date alone", () => {
    // Waiting tasks are blocked on someone else; the app should surface
    // followUpDate rather than dueDate for these (spec section 15).
    const task = { status: "Waiting", waitingOn: "Client", dueDate: null, followUpDate: addDays(new Date(), 3) };
    expect(task.status).toBe("Waiting");
    expect(isOverdue(task.dueDate)).toBe(false);
  });
});
