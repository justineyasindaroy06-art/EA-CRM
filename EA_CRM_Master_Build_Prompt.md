# MASTER BUILD PROMPT — PRIVATE EA CRM / CLIENT OPERATIONS HUB

## ROLE

Act as a senior full-stack engineer, CRM architect, product designer, database architect, automation engineer, and QA engineer.

You are building a private CRM / client operations hub for a freelance Executive Assistant who manages multiple confidential clients.

The application is for the EA's own use only in V1. There are no client logins and no team logins in V1.

The product should be simple, fast, clean, modular, secure, and easy to change later.

Do NOT invent business requirements that are not described in this specification.

When a requirement is ambiguous, choose the simplest reversible implementation and document the assumption in the project notes. Do not block development with unnecessary questions.

---

# 1. PRODUCT VISION

Build one private command center where the EA can manage:

- Multiple client workspaces
- Leads
- Contacts
- Client onboarding
- Tasks
- Meetings
- Google Calendar / Google Meet links
- Google Drive files and folders
- Content production
- Packages
- Invoices
- Payments
- Time tracking
- Weekly/monthly reports
- Activity history
- Next Actions

The goal is NOT to rebuild Gmail, Slack, WhatsApp, Canva, CapCut, Google Drive, Google Meet, or a payment processor.

The CRM should be the OPERATIONS COMMAND CENTER while specialist tools remain the systems of record for their specialized functions.

Core principle:

> Do not build a CRM that only stores information. Build a CRM that tells the EA what matters and what needs to happen next.

---

# 2. PRIMARY USER

V1 has exactly one human application user:

- Executive Assistant / CRM Owner

The owner manages multiple confidential client workspaces.

Example:

- Client A workspace
- Client B workspace
- Future Client C
- Future Client D

All data must be associated with a workspace so client data cannot accidentally mix.

Do NOT build multi-user permissions in V1, but design the database so roles/users can be added later.

---

# 3. RECOMMENDED PRODUCT STRUCTURE

Main navigation:

1. Dashboard
2. Leads
3. Clients
4. Tasks
5. Calendar
6. Content
7. Billing
8. Time
9. Settings

Use a simple left sidebar on desktop.

Keep navigation shallow.

Do not create excessive menus or enterprise-style complexity.

Include a Client / Workspace Switcher near the top.

Workspace choices:

- All Clients
- Client A
- Client B
- Future Client C...

When a workspace is selected, views should filter to that workspace.

---

# 4. MAIN DASHBOARD

The dashboard should answer:

> "What do I need to handle today?"

Prioritize actions over decorative analytics.

Suggested sections:

## Today
- Tasks due today
- Meetings today
- Follow-ups due
- Payments needing attention

## Needs Attention
Show high-priority unresolved items such as:
- Overdue task
- Lead follow-up due
- Agreement awaiting signature
- Invoice overdue
- Client action due
- Content awaiting approval

## Today's Tasks
List tasks due today.

## Today's Meetings
Show:
- Time
- Client
- Meeting title
- Google Meet link
- Status

## Lead Activity
Show:
- New leads
- Follow-ups due
- Consultations booked

## Active Clients
Show:
- Client
- Program/package
- Next Action
- Next Action Due

## Content
Show:
- Awaiting approval
- Due soon
- Scheduled
- Overdue

## Billing
Show:
- Outstanding amount
- Invoices due
- Overdue invoices

## Time
Show active timer and recent time entry.

## UNIVERSAL NEXT ACTIONS
This is a high-priority dashboard component.

Aggregate meaningful next actions from:
- Leads
- Clients
- Tasks
- Meetings
- Content
- Billing

Each item should clearly show:
- What
- Related client/workspace
- Due date
- Status
- Priority when relevant

---

# 5. CORE DATA ARCHITECTURE

Use a relational database.

Recommended logical entities:

- workspaces
- contacts
- leads
- clients
- tasks
- meetings
- content_items
- packages
- client_packages
- invoices
- payments
- time_entries
- files
- activities
- settings / integration configuration
- automation_runs / logs if needed

Use primary keys and foreign keys.

Every client-specific record must be connected to a workspace.

Where possible, use shared contact records rather than duplicating person information.

---

# 6. WORKSPACES

A workspace represents one client/company managed by the EA.

Fields:

- id
- name
- status
- description
- google_drive_root_url
- notes
- created_at
- updated_at

Statuses:
- active
- archived

The system must support future workspaces without requiring code duplication.

---

# 7. CONTACT MODEL

A CONTACT represents the person.

This is intentionally separate from a LEAD or CLIENT.

Reason:
A person can begin as a lead, become a client, later become inactive, and potentially return.

Suggested fields:

- id
- workspace_id
- first_name
- last_name
- email
- phone
- company
- job_title
- notes
- created_at
- updated_at

Do not duplicate the person's identity across every lifecycle state.

---

# 8. LEADS

Lead source is primarily the website form.

### Website form fields

## Basic Information
- First Name
- Last Name
- Email
- Phone Number
- Company / Organization
- Job Title

## About Them
- What are you interested in?
- What service or program are you interested in?
- What is your biggest challenge right now?
- What result are you hoping to achieve?
- How did you hear about us?

## Qualification
- What type of support are you looking for?
- Preferred coaching/program type
- Preferred start date
- Budget range
- Have you worked with a coach before?

## Booking
- Would you like to schedule a consultation?
- Preferred date/time

Do NOT make the Google booking URL a manual form field.

The CRM should send the booking link automatically.

### Lead system fields

- id
- workspace_id
- contact_id
- status
- source
- interested_in
- service_or_program
- biggest_challenge
- desired_result
- support_type
- preferred_program_type
- preferred_start_date
- budget_range
- worked_with_coach_before
- consultation_requested
- consultation_status
- agreement_status
- payment_status
- created_at
- updated_at
- last_contacted_at
- next_follow_up_at
- next_action
- next_action_due
- notes

---

# 9. LEAD STATUSES

Use:

1. New Lead
2. Contacted
3. Consultation Booked
4. Consultation Completed
5. Agreement Sent
6. Agreement Signed
7. Payment Pending
8. Paid
9. Ready for Conversion
10. Nurture
11. Re-engaged
12. Lost / Disqualified

The final lead-to-client conversion should remain under the EA's control.

Do not automatically convert solely because a payment or booking occurred unless the EA explicitly clicks Convert to Client.

---

# 10. LEAD AUTOMATION

The website form triggers the lead workflow.

## Day 0

When a new lead is created:

1. Create/update Contact.
2. Create Lead.
3. Set status = New Lead.
4. Associate the record with the correct workspace.
5. Assign owner = current EA user.
6. Send welcome email.
7. Send booking/calendar link.
8. Record communication/automation activity.
9. Create EA follow-up task.
10. Set next action.

## Day 3–5

If no meaningful response / no booking:

- Create a follow-up task for the EA.
- Optionally send the configured automated follow-up email.
- Do not create duplicate follow-up tasks if one is already open.

The timing should be configurable in settings.

Default:
- 3 to 5 days

## Day 10

If still no response:

- Send final follow-up email.
- Create review task for EA.
- Stop active sales follow-up automation.

## After Day 10

Move lead to:

Nurture

Do not mark as Lost automatically.

Nurture leads may later receive:
- Discounts
- Offers
- Announcements
- Relevant marketing
- Re-engagement content

The CRM should support moving a nurture lead back to Re-engaged when the prospect responds.

---

# 11. CLIENT CONVERSION

Conversion criteria are a combination of signals:

- Consultation completed
- Agreement signed
- Payment received
- EA confirmation

The CRM should visually show a conversion-readiness checklist.

Example:

- Consultation completed: ✅
- Agreement signed: ✅
- Payment received: ✅
- EA confirmation: ⬜

Button:

> Convert to Client

Do not automatically convert without EA confirmation.

When conversion happens:

1. Preserve contact identity.
2. Create client record.
3. Preserve lead history.
4. Set client status = Active.
5. Create or link Google Drive root folder.
6. Create default client folder structure.
7. Create onboarding tasks.
8. Add client to dashboard.
9. Add activity record.

---

# 12. CLIENT ONBOARDING

Keep V1 onboarding intentionally simple.

On Convert to Client:

### Automatically create:
- Client profile
- Client workspace association
- Google Drive folder/link
- Standard Drive subfolders if integration supports folder creation
- Onboarding task checklist

Suggested onboarding tasks:

- Send welcome email
- Send agreement / confirm agreement
- Confirm payment
- Schedule first session / event
- Prepare client materials

Do not automate irreversible or high-risk actions without owner review.

---

# 13. CLIENT PROFILE

Keep the client page simple.

Header:

- Client name
- Status
- Program/package
- Start date
- Next Action

Quick Info:
- Email
- Phone
- Company
- Client Type
- Program / Package
- Start Date
- Next Meeting
- Outstanding Balance

Main tab structure:

1. Overview
2. Tasks
3. Meetings
4. Files
5. Billing

Do not create excessive tabs in V1.

## Overview should contain:

- Quick Info
- Next Action
- Next Action Due
- Upcoming Meeting
- Outstanding Balance
- Recent Activity
- Notes

---

# 14. UNIVERSAL NEXT ACTION SYSTEM

This is a core product principle.

Every important record should be able to have:

- next_action
- next_action_due
- status
- priority where appropriate

Use this concept across:

- Leads
- Clients
- Tasks
- Meetings
- Content
- Billing

Example:

Client:
- Next Action: Send onboarding materials
- Due: Sept 16

Lead:
- Next Action: Follow up about consultation
- Due: Sept 18

Content:
- Next Action: Send design to CEO for approval
- Due: Sept 17

Do not rely on the EA's memory.

---

# 15. TASK SYSTEM

Keep task UX simple.

Primary task views:

- Today
- Upcoming
- Overdue
- Completed

Task fields:

- id
- workspace_id
- task_name
- related_contact_id
- related_lead_id
- related_client_id
- category
- priority
- status
- due_date
- next_action
- notes
- created_at
- completed_at

Categories:
- Lead
- Client
- Meeting
- Content
- Billing
- Admin

Statuses:
- To Do
- In Progress
- Waiting
- Done

Priority:
- Low
- Medium
- High
- Urgent

Include:
- Waiting On
- Follow-up Date

Example:

Status = Waiting
Waiting On = Client
Follow-up Date = Sept 20

This prevents the overdue list from being filled with work blocked by someone else.

---

# 16. TASK AUTOMATIONS

Automatically create tasks when useful.

Examples:

New lead:
- Create follow-up task

Client conversion:
- Create onboarding tasks

Meeting completed:
- Create follow-up task

Invoice overdue:
- Create payment follow-up task

Content approved:
- Create publishing task

Do not create duplicate tasks.

---

# 17. CALENDAR + MEETINGS

Google Calendar remains the calendar system.

The CRM should integrate with Google Calendar where possible.

Meeting record fields:

- id
- workspace_id
- lead_id
- client_id
- title
- meeting_type
- external_calendar_event_id
- google_meet_url
- start_at
- end_at
- status
- notes
- next_action
- next_action_due
- created_at
- updated_at

Statuses:
- Scheduled
- Completed
- Cancelled

Views:
- Today
- Upcoming
- Calendar

When a meeting is completed:

- Let EA add notes.
- Let EA define Next Action.
- Offer/create follow-up task.

When a booking comes from the lead flow, connect the Google Calendar event to the lead when possible.

---

# 18. GOOGLE DRIVE FILES

Google Drive remains the source of truth for files.

Do NOT build proprietary file storage in V1.

The CRM should store metadata and links.

File fields:

- id
- workspace_id
- client_id
- name
- type
- drive_url
- folder_name
- created_at
- notes

Default client Drive structure:

01 - Contracts
02 - Client Documents
03 - Presentations
04 - Videos & Media
05 - Marketing
06 - Other

When a client is created, create or link the root Google Drive folder.

Show:

- Open Google Drive
- Recent Files

Files should be linkable from tasks where useful.

---

# 19. CONTENT MANAGEMENT

The boss creates content weekly.

Content module fields:

- id
- workspace_id
- title
- content_type
- platform
- status
- due_date
- publish_date
- next_action
- next_action_due
- canva_url
- capcut_url
- google_drive_url
- notes
- created_at
- updated_at

Content types:
- Presentation
- Poster
- Ad
- Video
- Social Post
- Other

Platforms should be configurable.

Default example platforms:
- LinkedIn
- Facebook
- Instagram
- Website

Statuses:

Idea
Draft
Design
Review
Approved
Scheduled
Published

Workflow:

Idea → Draft → Design → Review → Approved → Scheduled → Published

Do not try to replace Canva or CapCut.

The CRM stores the links and workflow state.

---

# 20. PACKAGES

Packages are reusable offerings.

Fields:

- id
- workspace_id
- name
- description
- price
- duration
- package_type
- active
- created_at
- updated_at

The client can be associated with a package through a client_packages relation.

---

# 21. BILLING

Keep billing simple in V1.

Modules:

- Packages
- Invoices
- Payments

## Invoice fields

- id
- workspace_id
- client_id
- package_id
- invoice_number
- invoice_date
- due_date
- amount
- status
- invoice_url
- notes
- created_at
- updated_at

Statuses:
- Draft
- Sent
- Paid
- Partially Paid
- Overdue
- Cancelled

## Payment fields

- id
- workspace_id
- invoice_id
- client_id
- amount
- payment_date
- payment_method
- reference_number
- notes
- created_at

Outstanding balance should be calculated:

Invoice Total - Applied Payments = Balance

The CRM should NOT process card/bank payments itself in V1.

Payment processing can be integrated later.

---

# 22. TIME TRACKING

Build an internal timer for the EA.

Primary action:

> Start Timer

The EA selects:
- Workspace/client
- Project
- Task

Time entry fields:

- id
- workspace_id
- client_id
- project
- task_id
- start_at
- end_at
- duration
- billable
- notes
- created_at

Support:

- Start
- Pause if practical
- Stop
- Manual time entry
- Edit entry
- Billable / Non-billable

Reports:
- Today
- Weekly
- Monthly
- Client
- Project

The system should calculate total duration automatically.

---

# 23. ACTIVITY TIMELINE

Create an activity timeline for important records, especially clients.

Examples:

- Lead submitted website form
- Welcome email sent
- Booking link sent
- Consultation booked
- Consultation completed
- Agreement sent
- Agreement signed
- Payment received
- Client converted
- Task completed
- Meeting completed
- Invoice sent

Activity should include:

- timestamp
- workspace
- record type
- record id
- event type
- summary
- metadata where useful

The activity timeline should be read-only from normal UI except where manual notes are intentionally added.

---

# 24. SEARCH

Include global search.

Search across:
- Clients
- Contacts
- Leads
- Tasks
- Meetings
- Content
- Invoices

Search by:
- Name
- Email
- Company
- Invoice number
- Keyword where practical

Keep search fast.

---

# 25. FILTERING

Every list should have simple filters.

Examples:

Leads:
- Status
- Source
- Consultation Status

Clients:
- Active / Archived
- Program / Package

Tasks:
- Today
- Upcoming
- Overdue
- Status
- Priority
- Client

Content:
- Status
- Platform
- Type

Billing:
- Status
- Client
- Date range

Time:
- Client
- Date range
- Billable

---

# 26. DESIGN / UX REQUIREMENTS

Overall visual direction:

- Modern
- Minimal
- Professional
- Calm
- Executive-assistant-friendly
- Fast to scan
- Not visually noisy

Do not use excessive cards, gradients, animations, or decorative dashboards.

Prefer:
- clear typography
- compact tables
- subtle status badges
- visible actions
- consistent spacing
- predictable navigation

The dashboard should prioritize:
1. Attention
2. Next Actions
3. Schedule
4. Exceptions
5. Information

---

# 27. RESPONSIVE DESIGN

Support:
- Desktop
- Tablet
- Mobile

Desktop is the primary use case.

Mobile should support:
- Dashboard
- Tasks
- Meetings
- Leads
- Clients
- Timer

---

# 28. SECURITY / PRIVACY

This CRM contains confidential client information.

Implement sensible security practices:

- Authentication required
- Protected routes
- Secure secret storage
- Environment variables for credentials
- No API secrets in frontend code
- Validate all input
- Sanitize user-generated content
- Use parameterized queries / ORM protections
- Enforce workspace-level data isolation in the database
- Prevent accidental cross-workspace reads/writes

Even with one user, architect records with workspace ownership.

If using Supabase/Postgres, use Row Level Security where appropriate and design policies so workspace boundaries are enforceable.

---

# 29. INTEGRATION PRINCIPLES

Integrations should be modular and optional.

Potential integrations:

- Website form intake
- Gmail
- Google Calendar
- Google Meet
- Google Drive
- Canva
- CapCut
- Slack
- WhatsApp
- Future payment provider

V1 priority integrations:

1. Website form intake
2. Google Calendar
3. Google Meet
4. Google Drive

Gmail can be added in a controlled way for communication history and/or sending automated messages.

Slack/WhatsApp should NOT be deeply recreated in V1.

Canva/CapCut should primarily be represented as links and workflow metadata.

---

# 30. EMAIL AUTOMATION

Build email templates/configuration rather than hardcoding copy directly into business logic.

Initial email concepts:

- New lead welcome
- Booking reminder
- Follow-up
- Final follow-up
- Client welcome
- Invoice sent
- Payment reminder
- Marketing / nurture

Store templates in a configurable place.

Allow enable/disable per automation.

Record email automation events.

Avoid sending duplicate emails.

Use idempotency or automation state checks.

---

# 31. AUTOMATION SAFETY

Every automation should be designed so it can be:
- disabled
- retried safely
- logged
- tested without sending real messages

Create an automation log with useful information.

Example:

- automation name
- run time
- workspace
- related record
- status
- error
- attempt count

Use idempotent logic wherever practical.

---

# 32. V1 SCOPE CONTROL

Do NOT build all possible future features now.

Not in V1 unless required for the above workflows:

- Client portal
- Team collaboration
- Complex RBAC
- Full email inbox replacement
- Full WhatsApp interface replacement
- Full Slack replacement
- Full Canva editor
- Video editor
- Payment processor
- Advanced accounting
- AI assistant
- Full marketing automation suite
- Complex reporting engine
- Mobile native app

Build the foundation so these can be added later.

---

# 33. RECOMMENDED TECHNICAL DIRECTION

Use a modern full-stack architecture with:

- TypeScript
- React / Next.js or an equivalent maintainable full-stack React framework
- PostgreSQL relational database
- Supabase is acceptable/preferred if it simplifies:
  - auth
  - Postgres
  - storage where needed
  - row-level security
  - server-side functions

Use a component-based UI.

Use a clear service layer for external integrations.

Use migrations for database schema.

Use environment variables.

Do not couple the UI directly to third-party APIs when an abstraction/service layer is practical.

Keep integrations replaceable.

---

# 34. BUILD IN PHASES

Do not attempt a giant one-shot implementation.

Build in this order.

## PHASE 0 — FOUNDATION

Create:
- project structure
- app shell
- authentication
- database
- migrations
- workspace model
- seed/demo data
- environment configuration
- error handling
- basic logging

Acceptance:
- App launches
- Login works
- Database connected
- Workspace switching works
- Seed data displays
- Protected routes work

## PHASE 1 — CONTACTS + LEADS

Build:
- Contact model
- Lead model
- Lead dashboard
- Lead detail
- Lead status pipeline
- Website form intake endpoint
- Create/update contact logic

Acceptance:
- Website form creates lead
- Duplicate contact handling works
- Lead appears in correct workspace
- Status can be changed
- Next Action can be set

## PHASE 2 — LEAD AUTOMATIONS

Build:
- Welcome email
- Booking link
- Follow-up scheduling
- Day 3–5 follow-up task
- Day 10 final follow-up
- Nurture transition
- Activity log
- Automation log

Acceptance:
- No duplicate automations
- Automations can be disabled
- Test mode exists
- Errors are logged
- Owner can see next follow-up

## PHASE 3 — CLIENT CONVERSION + ONBOARDING

Build:
- Client model
- Convert Lead to Client
- Conversion checklist
- Client profile
- Onboarding tasks
- Client dashboard

Acceptance:
- Lead history preserved
- Contact reused
- Client workspace correct
- Onboarding checklist created

## PHASE 4 — TASKS

Build:
- Task CRUD
- Today/Upcoming/Overdue/Completed
- Waiting status
- Priority
- Next Action
- Task links to client/lead/meeting/content/invoice

Acceptance:
- Tasks appear in dashboard
- Tasks can be filtered
- Duplicate automation tasks prevented

## PHASE 5 — CALENDAR / MEETINGS

Build:
- Google Calendar integration
- Meetings
- Google Meet link display
- Meeting notes
- Follow-up task creation

Acceptance:
- Calendar events can be displayed
- Meeting links are accessible
- Meeting can be associated with client/lead
- Completed meeting can create next action

## PHASE 6 — GOOGLE DRIVE / FILES

Build:
- Google Drive integration
- Client Drive folder link
- Optional folder creation
- Files metadata/link view

Acceptance:
- Client can open Drive
- Standard folder structure can be created when authorized
- CRM does not duplicate file storage unnecessarily

## PHASE 7 — CONTENT

Build:
- Content CRUD
- Content calendar
- Workflow/status
- Canva/CapCut/Drive links
- Next Action

Acceptance:
- Content moves through workflow
- Content appears in dashboard
- Content can be linked to client/workspace

## PHASE 8 — BILLING

Build:
- Packages
- Client packages
- Invoices
- Payments
- Balances
- Billing dashboard

Acceptance:
- Invoice can be created
- Payment can be recorded
- Balance calculates correctly
- Overdue status works

## PHASE 9 — TIME TRACKING

Build:
- Timer
- Manual entries
- Billable flag
- Weekly/monthly reports

Acceptance:
- Timer calculates duration accurately
- Manual correction works
- Reports filter by client and date

## PHASE 10 — DASHBOARD / POLISH / QA

Combine:
- Universal Next Actions
- Attention Center
- Activity timeline
- Search
- Filters
- Empty states
- Loading states
- Error states
- Responsive design
- Accessibility basics
- QA

---

# 35. TESTING REQUIREMENTS

Create automated tests for core business logic.

At minimum test:

## Lead
- Form creates lead
- Duplicate contact handling
- Lead status transitions

## Automation
- Day 0 workflow
- Day 3–5 follow-up
- Day 10 final follow-up
- Nurture transition
- Duplicate prevention

## Conversion
- Lead to Client
- Contact preserved
- Lead history preserved
- Onboarding tasks created

## Tasks
- Due date logic
- Overdue logic
- Waiting status

## Billing
- Invoice total
- Partial payment
- Remaining balance
- Overdue calculation

## Time
- Timer start/stop
- Duration
- Manual edit
- Weekly/monthly totals

## Security
- Workspace isolation
- Unauthorized record access blocked

---

# 36. SEED DATA

Provide realistic demo data for development only.

Use clearly fictional placeholder records.

Example workspaces:
- Demo Client A
- Demo Client B

Include:
- 5 leads
- 3 active clients
- 8 tasks
- 4 meetings
- 6 content items
- 3 invoices
- 3 payments
- several time entries

Do not use real people or sensitive data in seed files.

---

# 37. DATA VALIDATION

Validate:

- required fields
- email formatting
- dates
- amounts
- invoice numbers
- duplicate records
- workspace ownership

Use clear user-friendly error messages.

---

# 38. AUDITABILITY

Important state changes should create activity records.

Examples:

- lead status changed
- client created
- task completed
- invoice sent
- payment recorded
- content published

Do not make the audit system overly complex in V1.

---

# 39. EMPTY STATES

Every module must have a helpful empty state.

Examples:

No leads:
> No leads yet. New website submissions will appear here.

No clients:
> No active clients yet.

No tasks:
> You're all caught up.

No content:
> No content scheduled yet.

No invoices:
> No invoices yet.

Empty states should guide the next action without clutter.

---

# 40. ERROR HANDLING

Use:
- clear error messages
- retry actions where appropriate
- safe fallbacks for failed integrations
- logging
- no silent failures

For external integrations, show whether an item is:
- connected
- disconnected
- awaiting authorization
- failed

---

# 41. SETTINGS

Settings should contain:

## Workspace Settings
- Workspace information
- Default Drive structure
- Default task preferences

## Automation Settings
- Follow-up timing
- Enable/disable email automations
- Booking link
- Email templates

## Integration Settings
- Google Calendar
- Google Drive
- Gmail
- Future integrations

## Billing Settings
- Default currency
- Invoice numbering
- Payment methods

## Time Settings
- Default billable behavior

Do not expose secrets in the UI.

---

# 42. FUTURE-PROOFING

The architecture should make it possible later to add:

- Client portal
- Team users
- Roles / permissions
- Additional CRM pipelines
- More advanced marketing
- Payment processor integration
- AI summarization
- Automated meeting notes
- WhatsApp integration
- Slack integration
- More reporting

But do not implement those just because they are possible.

---

# 43. DEVELOPMENT RULES

1. Build incrementally.
2. Keep commits / changes logically separated by feature.
3. Run tests after meaningful changes.
4. Do not silently change the data model without migrations.
5. Keep business logic out of presentation components where possible.
6. Avoid duplicated business rules.
7. Favor reusable components.
8. Prefer configuration over hardcoded behavior.
9. Never hardcode production credentials.
10. Do not expose private client data to logs.
11. Preserve workspace boundaries everywhere.
12. Keep third-party integrations modular.
13. Make destructive operations explicit.
14. Prefer reversible changes.
15. Keep V1 small and usable.

---

# 44. UX ACCEPTANCE CRITERIA

The finished V1 should feel like this:

The EA logs in.

She can immediately see:

- What is due today
- What is overdue
- Which leads need follow-up
- Which clients need attention
- What meetings are coming up
- What content is waiting
- Which invoices need action
- How much time she is tracking

She can then:

- Open a client
- See the whole client context
- See Next Action
- Open Google Drive
- Open a meeting
- Open tasks
- Open invoices
- Start the time tracker

She should not need to hunt through multiple applications to understand the status of a client.

---

# 45. FINAL PRODUCT PRINCIPLES

Use these principles when making implementation decisions:

### Principle 1
Simple beats clever.

### Principle 2
The CRM is the command center, not a replacement for every other application.

### Principle 3
The system should reduce manual remembering.

### Principle 4
Every important record should have a clear Next Action.

### Principle 5
Automate repetitive work, but keep important business decisions under owner control.

### Principle 6
Client data must stay isolated by workspace.

### Principle 7
Build V1 so it can evolve into a professional multi-client EA operating system.

---

# 46. REQUIRED FIRST ACTION

Before writing the full application, do the following:

1. Inspect the existing project directory.
2. Determine whether a project already exists.
3. If it exists, preserve useful existing work.
4. If no project exists, initialize the project.
5. Create the proposed architecture.
6. Create the database schema and migrations.
7. Create seed/demo data.
8. Build the app shell and navigation.
9. Build Phase 0 completely.
10. Run the application and tests.
11. Then proceed phase-by-phase.

Do not pretend an integration works if credentials are unavailable.

For integrations that cannot be completed without credentials:
- build the interface
- build the service abstraction
- build mocked/test mode
- clearly identify required environment variables
- provide setup instructions
- continue with the rest of the application

---

# 47. REQUIRED FINAL DELIVERABLES

At the end of implementation, provide:

1. Working application
2. Database schema/migrations
3. Seed/demo data
4. Environment variable template
5. Setup instructions
6. Integration setup instructions
7. Test suite
8. README
9. Known limitations
10. Clear list of unfinished integrations that require credentials or external configuration

Do not claim production readiness unless the application has actually been tested.

