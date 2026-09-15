import { z } from "zod";

/** Website lead-intake form (spec section 8). */
export const leadIntakeSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),

  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),

  interestedIn: z.string().optional(),
  serviceOrProgram: z.string().optional(),
  biggestChallenge: z.string().optional(),
  desiredResult: z.string().optional(),
  howHeard: z.string().optional(),

  supportType: z.string().optional(),
  preferredProgramType: z.string().optional(),
  preferredStartDate: z.string().optional(),
  budgetRange: z.string().optional(),
  workedWithCoachBefore: z.boolean().optional(),

  consultationRequested: z.boolean().optional(),
  preferredConsultationTime: z.string().optional(),
});

export type LeadIntakeInput = z.infer<typeof leadIntakeSchema>;

export const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
});

export const taskSchema = z.object({
  taskName: z.string().min(1, "Task name is required"),
  category: z.enum(["Lead", "Client", "Meeting", "Content", "Billing", "Admin"]),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum(["To Do", "In Progress", "Waiting", "Done"]),
  dueDate: z.string().optional().nullable(),
  waitingOn: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1),
  packageId: z.string().optional().nullable(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  dueDate: z.string(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  status: z.enum(["Draft", "Sent", "Paid", "Partially Paid", "Overdue", "Cancelled"]),
  notes: z.string().optional().nullable(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().optional().nullable(),
  clientId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.string(),
  paymentMethod: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
