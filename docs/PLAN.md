# Implementation Plan — Telegram Daily Accountability Bot

Source of truth for requirements: [`PRODEUCT.md`](./PRODEUCT.md).
This plan turns that spec into small, independently shippable steps. Each step
ends in a working state and at least one git commit (see "Git rules" below).

---

## 0. Key decisions & spec gaps

These are decisions the spec leaves open or that the platform forces. Revisit
only with explicit approval.

| # | Topic | Decision |
|---|-------|----------|
| D1 | **Cron frequency** | Vercel Hobby allows only daily crons. Reminders need a run **every 5 minutes** → requires **Vercel Pro**. Fallback if staying on Hobby: an external pinger (e.g. cron-job.org) hitting the same protected endpoint. The endpoint is identical either way. |
| D2 | **Dedup storage** | Spec asks for three primary tables. Idempotency needs two tiny support tables: `ProcessedUpdate` (Telegram `update_id`) and `DailyReport` (`date` unique). Still "three primary" tables. |
| D3 | **Reminder scheduling** | Store `nextReminderAt` (UTC `DateTime?`) on `DailyTask`. Cron selects `status = PENDING AND nextReminderAt <= now()`. No in-memory state. |
| D4 | **Reminder message tracking** | Store `reminderMessageId` on `DailyTask` so the latest reminder can be edited (buttons removed / status shown) after a response. |
| D5 | **Text input (titles, specific time)** | Multi-step flows (`/tasks` add/edit, `/add` → "at specific time") need free text. Store pending flow in DB (`User.pendingAction` JSON). Status updates stay button-only, as the spec requires. |
| D6 | **INCOMPLETE finalization** | After the 2nd follow-up is sent, set `nextReminderAt = sentAt + 1h` as a "finalize" marker (`reminderCount = 3`). When due, mark `INCOMPLETE`. Any still-`PENDING` task is also finalized right before the 22:00 report. Owner can still press **Completed** later the same day (→ `COMPLETED`). |
| D7 | **Cutoff** | `REMINDER_CUTOFF` = `21:30` (group TZ), configurable via env (default 21:30). Any reminder whose time is after the cutoff is skipped; if no more reminders are possible the task waits for report-time finalization. |
| D8 | **Daily generation time** | Instances for "today" are generated lazily by every cron run (idempotent upsert on `(recurringTaskId, date)`), so a missed midnight run self-heals. |
| D9 | **Definition changes take effect tomorrow** | Generation copies `title` / `reminderTime` into `DailyTask`. Editing a `RecurringTask` never touches existing `DailyTask` rows. If today's instance is already generated, it's unchanged; if a task is created today after generation… it will first appear tomorrow. |
| D10 | **Date representation** | `DailyTask.date` is a `@db.Date` holding the calendar date in the group TZ. `reminderTime` stored as `"HH:mm"` string. Conversion to UTC via `date-fns-tz` (DST-safe). |
| D11 | **Users scope** | Single group (`GROUP_CHAT_ID`). Updates from any other chat are ignored (except `/start` in private chat, which only replies with a pointer to the group). |
| D12 | **Prisma + Neon** | Prisma with `@prisma/adapter-neon` (serverless driver) and a singleton client cached on `globalThis`. `DIRECT_URL` used for migrations. |
| D13 | **Cron batching** | Each run processes at most N due tasks (e.g. 50) to stay within function time limits; remainder is picked up by the next run. |

---

## 1. Data model (Prisma)

```prisma
enum TaskStatus { PENDING COMPLETED INCOMPLETE CANCELLED }

model User {
  id             String   @id @default(cuid())
  telegramUserId BigInt   @unique
  displayName    String
  chatId         BigInt
  isActive       Boolean  @default(true)
  pendingAction  Json?    // D5
  createdAt      DateTime @default(now())
  recurringTasks RecurringTask[]
  dailyTasks     DailyTask[]
}

model RecurringTask {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  reminderTime String   // "HH:mm"
  isActive     Boolean  @default(true)
  deletedAt    DateTime? // soft delete keeps history intact
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  dailyTasks   DailyTask[]
}

model DailyTask {
  id                String     @id @default(cuid())
  userId            String
  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  recurringTaskId   String?
  recurringTask     RecurringTask? @relation(fields: [recurringTaskId], references: [id], onDelete: SetNull)
  title             String
  date              DateTime   @db.Date
  reminderTime      String?    // null = no reminder (one-time tasks)
  status            TaskStatus @default(PENDING)
  reminderCount     Int        @default(0)
  nextReminderAt    DateTime?  // D3
  reminderMessageId Int?       // D4
  completedAt       DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  @@unique([recurringTaskId, date])
  @@index([status, nextReminderAt])
  @@index([date])
}

model ProcessedUpdate { updateId BigInt @id  createdAt DateTime @default(now()) }
model DailyReport     { date DateTime @id @db.Date  messageId Int?  createdAt DateTime @default(now()) }
```

Note: Postgres treats `NULL`s as distinct in unique indexes, so one-time tasks
(`recurringTaskId = null`) are unaffected by `@@unique([recurringTaskId, date])`.

---

## 2. Project layout

```
src/
  app/api/telegram/route.ts   # webhook (POST) — secret header check, dedup, grammY handleUpdate
  app/api/cron/route.ts       # cron (GET) — Bearer CRON_SECRET, runs scheduler tick
  bot/
    bot.ts                    # grammY Bot instance + handler registration
    commands/{start,help,tasks,add,report}.ts
    callbacks.ts              # inline button router (callback_data parsing + owner check)
    keyboards.ts
    messages.ts               # all user-facing text in one place
  core/
    time.ts                   # group-TZ helpers: today(), toUtc(date, "HH:mm"), cutoff, DST-safe
    generation.ts             # ensureTodayInstances()
    reminders.ts              # schedule math + processDueReminders()
    report.ts                 # buildReport(date), publishReportOnce(date)
    tasks.ts                  # status transitions (complete, notYet, cancel, finalize)
    validation.ts             # title / time parsing
  lib/
    db.ts                     # Prisma singleton (Neon adapter)
    env.ts                    # zod-validated env
prisma/schema.prisma
vercel.json                   # cron config
```

Core logic in `src/core` is pure-ish (takes `now` and a db client) so it can be
unit-tested without Telegram.

---

## 3. Reminder state machine

```
reminderCount  meaning                          nextReminderAt
0              not yet asked                    T            (clamped by cutoff)
1              initial sent                     T + 1h       (follow-up #1)
2              follow-up #1 sent                T + 2h       (follow-up #2)
3              follow-up #2 sent                sent + 1h    (finalize → INCOMPLETE)
```

- Follow-ups stay on the T+1h / T+2h grid, but never less than 45 min after
  the previous send (so a cron outage doesn't cause back-to-back reminders).
- Any candidate time > cutoff → no more reminders; `nextReminderAt = null`
  (task finalized at report time). Recurring task times after the cutoff are
  rejected at input, since such a task could never be answered.
- A reminder is skipped (and `nextReminderAt` cleared) when it's no longer the
  task's day, past the cutoff, the definition is paused/deleted, or the user is
  inactive.
- **Completed** button → `COMPLETED`, `completedAt = now`, `nextReminderAt = null`,
  edit the reminder message to show ✅ and remove buttons. Guarded update:
  `WHERE id = ? AND status IN (PENDING, INCOMPLETE)` → second click is a no-op.
- **Not yet** → keep `PENDING`, replace that message's buttons with just
  **Completed** and show the next check time; next reminder stays as already
  scheduled (count increments only when a reminder is sent).
- Sending a new reminder clears the buttons on the previous one.
- **Finalize** (count = 3, due) → `INCOMPLETE`; the last reminder is edited to
  "didn't complete" with a **Completed** button (valid for the rest of the day).
- **Cron tick order** (`src/core/tick.ts`): finalize past days → generate today →
  finalize due → at ≥ report time finalize the whole day → send reminders.
  Closing the day before sending guarantees nothing goes out after the report.
- Non-owner click → `answerCallbackQuery("Only <name> can answer this")`, no DB write.
- **Sending a reminder (idempotent):** claim the row first with a conditional
  update (`WHERE id = ? AND reminderCount = k AND status = PENDING`) that bumps
  `reminderCount` and `nextReminderAt`; only the run that wins the claim sends
  the message. Telegram failure → revert claim so the next run retries.

---

## 4. Phases & steps (each bullet ≈ one small commit)

### Phase 1 — Project setup
1. `git init`, `.gitignore`, docs (spec + this plan).
2. `pnpm create next-app` (App Router, TS, src dir, no Tailwind needed) and strip boilerplate.
3. Add `zod`, `src/lib/env.ts` with all env vars; `.env.example`.
4. Add Prisma + Neon adapter, `src/lib/db.ts` singleton, schema from §1, first migration.
5. Add `vitest` + one smoke test; `pnpm lint`, `pnpm typecheck`, `pnpm test` scripts.

### Phase 2 — Telegram integration
6. grammY bot instance; `/api/telegram` route with `X-Telegram-Bot-Api-Secret-Token` check.
7. `ProcessedUpdate` dedup (insert-or-skip on `update_id`) before handling.
8. Group filter (`GROUP_CHAT_ID`) middleware.
9. `/start` — upsert `User` (telegram id, display name, chat id); `/help`.
10. Script `pnpm bot:set-webhook` to register webhook + command list.

### Phase 3 — Recurring tasks
11. `core/validation.ts`: title (1–100 chars, trimmed, no control chars), time `HH:mm`.
12. `/tasks` list with inline keyboard (per task: edit title / change time / toggle active / delete).
13. Add-recurring flow via `pendingAction` (title → time).
14. Edit title / change time / activate / deactivate / soft delete (owner-only).
15. `core/time.ts` + `core/generation.ts` (`ensureTodayInstances`) with tests incl. DST days.

### Phase 4 — Reminder system
16. `/api/cron` route with `Authorization: Bearer ${CRON_SECRET}`; `vercel.json` cron `*/5 * * * *`.
17. `core/reminders.ts` schedule math (pure) + tests (cutoff, late tasks, DST).
18. `processDueReminders`: claim → send → persist (batch limit).
19. Callback handlers: Completed / Not yet with owner validation and guarded updates.
20. Finalize to `INCOMPLETE` (count = 3 due, and pre-report sweep).
21. Late completion: allow **Completed** on `INCOMPLETE` tasks the same day.

### Phase 5 — One-time tasks
22. `/add <title>` (or prompt for title if empty) → keyboard: 30 min / 1 h / specific time / no reminder.
23. Specific-time flow via `pendingAction`; reject times in the past or after cutoff.
24. Ensure one-time tasks share the reminder pipeline (`recurringTaskId = null`).

### Phase 6 — Daily report
25. `core/report.ts` aggregation + formatter (empty state "No tasks today", % rounding) + tests.
26. `/report` command (current-day snapshot, not the "final" one).
27. Cron: at ≥ 22:00 group TZ, finalize pending → insert `DailyReport` row (unique on date) → send → store `messageId`. Insert-first guarantees one report per day.

### Phase 7 — Deployment
28. Vercel project + Neon prod DB, env vars, `prisma migrate deploy` in build.
29. Set webhook to prod URL; verify cron runs (Vercel Pro, see D1).
30. Manual test checklist: duplicate update, double click, non-owner click, cron run twice, skip a cron run, task at 21:15, DST date.

---

## 5. Testing strategy

- **Unit (vitest):** time/TZ helpers, reminder schedule math, report formatting, validation.
- **Integration:** core functions against a Neon branch DB (or local Postgres) — generation idempotency, claim race (run tick twice concurrently), report once.
- **Manual:** checklist in step 30, run in a private test group.

---

## 6. Git rules

- Commit after **every small, working change** — one step from §4 is usually one commit; split further if it grows.
- Never commit broken builds: run `pnpm typecheck && pnpm lint && pnpm test` (once they exist) before committing.
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` with optional scope, e.g. `feat(reminders): send follow-up reminders`.
- Subject ≤ 72 chars, imperative mood; body explains *why* when not obvious.
- Never commit secrets — `.env*` is ignored; only `.env.example` is tracked.
- Work on `main` for the MVP phases; use a branch for anything experimental.
