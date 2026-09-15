"use client";

import { useState, useRef } from "react";
import { recordPaymentAction } from "./actions";

export function RecordPaymentForm({
  clients,
  invoices,
}: {
  clients: { id: string; label: string }[];
  invoices: { id: string; clientId: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
        Record Payment
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await recordPaymentAction(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-4"
    >
      <div>
        <label className="block text-xs font-medium text-neutral-500">Client</label>
        <select name="clientId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Invoice (optional)</label>
        <select name="invoiceId" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">None</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Amount</label>
        <input type="number" step="0.01" name="amount" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Payment date</label>
        <input type="date" name="paymentDate" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Method</label>
        <input name="paymentMethod" placeholder="Bank Transfer, Card..." className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Reference #</label>
        <input name="referenceNumber" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Record Payment
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
