# Anonymous conversations and proof of action

## Setup

Install dependencies with `npm ci`, fill in `.env.local` using `.env.example`, and apply migrations in order. Existing installations with migrations 0001 and 0002 need only 0003:

```bash
npm run db -- --file supabase/migrations/0003_closed_loop.sql
npm run dev
```

Migration 0003 and the application changes must be deployed together. The old application queries `feedback.raw_text`; the new migration removes HR access to that column and transfers its contents to `feedback_private`. Use a maintenance window for an existing deployment. This migration runs in a transaction.

## Three-minute demo

1. Open an employee session (or a separate signed-out browser) and submit: “We are regularly asked to stay after our shift, but those hours are not recorded.” Save the tracking code and private reply key.
2. In the HR inbox, open the item. Under **Private follow-up**, ask: “Is this happening regularly, and what change would help?”
3. Return to the employee feedback page and refresh the conversation. Draft: “I'm the only trainee on the Tuesday night shift. A published overtime approval process would help.” Select **Review privacy**, show the warning, then **Use suggested wording**. Review and send the revised reply.
4. HR refreshes the thread and creates a commitment: “Correct the overtime approval process”, owner “People Operations”, with a due date. Set it to **In progress**.
5. HR changes the commitment to **Completed by HR**, adding evidence: “Published the updated overtime process and asked shift leads to record all additional hours.” Evidence is required; the app does not independently verify that the claim is true.
6. The employee refreshes and selects **Yes, it helped** or **Still happening**. The HR overview's **Proof of action** card now distinguishes employee-confirmed improvements from HR-completed work. “Still happening” appears in the follow-through list.
7. Open the action history to show that changing a commitment requests a fresh confirmation without deleting earlier outcomes.

## Access model and privacy limits

- A tracking code continues to show the existing public status/summary page. It does **not** grant access to the new private thread or authorize replies and confirmations.
- A submitting account can access its own conversation, including anonymous feedback linked through an HMAC. Guests need a separate random 256-bit reply key; only its SHA-256 hash is stored in the server-only table. The browser attempts to remember the key in local storage. The receipt displays it for backup and use on another device.
- Anyone holding a reply key can act as the submitter. Do not give it to HR. Old guest submissions have no key and remain status-only; old account-linked submissions work through account ownership.
- HR authentication grants the HR side of the conversation. HR cannot use that permission to confirm an employee outcome, and database grants prevent direct writes to the conversation/action tables by ordinary authenticated clients.
- The reply privacy check runs locally and recognizes a small set of common identifiers and unique-role phrases. It has no AI dependency and is not comprehensive or multilingual. It does not change or send the draft without the employee's review. Replies are stored exactly as approved, without a second redaction step.
- Original intake is stored in `feedback_private`, which has no client policies or privileges. A trigger also isolates input from existing import/seed scripts. HR queries and browser payloads exclude raw input. Successful anonymous processing clears private raw text; failed processing retains it for retry. Identified originals remain private.
- AI processing sends original intake to the configured provider. Account linking can be reconstructed by an operator with the HMAC secret and database access. Unique circumstances can still identify a person. Do not pitch absolute anonymity.
- Action evidence is an HR-authored description, not independent verification. Employee confirmation is a separate signal, guarded by action revisions to prevent stale updates. History retains previous action snapshots and outcomes.
- This change does not redesign survey export privacy or infrastructure log/back-up retention.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Tests cover reply ownership, guest keys, HR/employee authorization, mandatory reply review, stale confirmation protection, action evidence validation, privacy suggestions, and migration privileges using an embedded PostgreSQL engine (PGlite).

For live acceptance, use separate employee and HR sessions with the real Supabase project. Verify the flow above, then test an unrelated employee account, a wrong reply key, a pending/failed analysis, and an action edited while the employee has an older revision open.
