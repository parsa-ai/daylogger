# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-implementation. The repo currently contains only the spec and the plan:

- `docs/PRODEUCT.md` — product requirements (source of truth; filename typo is intentional/kept).
- `docs/PLAN.md` — design decisions (D1–D13), Prisma schema, reminder state machine, and the numbered step list. Work through steps in order and update this file as real commands/structure appear.

Do not expand scope beyond `PRODEUCT.md` §21 (MVP) — §22 lists explicitly excluded features (no dashboard, Redis, workers, multi-group, streaks, etc.).

## Stack

Next.js (App Router) + TypeScript, grammY, Prisma on Neon Postgres (`@prisma/adapter-neon`), Vercel + Vercel Cron, pnpm, vitest.

## Commands (planned — verify in `package.json` once Phase 1 lands)

```bash
pnpm install
pnpm dev                       # next dev
pnpm typecheck && pnpm lint && pnpm test   # run before every commit
pnpm vitest run path/to/file.test.ts       # single test file
pnpm vitest run -t "test name"             # single test by name
pnpm prisma migrate dev        # local migration (uses DIRECT_URL)
pnpm prisma migrate deploy     # prod migration (in Vercel build)
pnpm bot:set-webhook           # register Telegram webhook + command list
```

## Architecture (big picture)

Serverless only — **no `setTimeout`/`setInterval`, in-memory queues, or process state**. All state lives in Postgres.

Two entry points:
- `src/app/api/telegram/route.ts` — webhook. Checks `X-Telegram-Bot-Api-Secret-Token`, dedups by `update_id` via `ProcessedUpdate` insert-or-skip, ignores chats other than `GROUP_CHAT_ID`, then hands off to the grammY bot (`src/bot/`).
- `src/app/api/cron/route.ts` — called every 5 min (`vercel.json`, requires Vercel Pro or an external pinger), guarded by `Authorization: Bearer $CRON_SECRET`. Each tick: ensure today's `DailyTask` instances exist → send due reminders → finalize → at ≥22:00 publish the report once.

Business logic lives in `src/core/` and takes `now` + a db client so it is testable without Telegram; `src/bot/` is a thin Telegram layer.

Key invariants (see `docs/PLAN.md` for detail):
- **Definitions vs. instances:** `RecurringTask` is copied into `DailyTask` (title, reminderTime) at generation. Editing/deleting a definition never touches existing `DailyTask` rows; changes apply from the next day. Recurring tasks are soft-deleted.
- **Idempotency via DB:** `@@unique([recurringTaskId, date])` for generation; `DailyReport.date` primary key inserted *before* sending; reminders are sent only after winning a conditional "claim" update (`WHERE reminderCount = k AND status = PENDING`); button handlers use guarded updates so repeat clicks are no-ops.
- **Reminder state machine:** `reminderCount` 0→1 at T, 2 at T+1h, 3 at T+2h, then finalize to `INCOMPLETE` at +1h; driven by `DailyTask.nextReminderAt` (UTC). Nothing is sent after the cutoff (`21:30`, configurable) or after the report. Owner may still mark `COMPLETED` later the same day.
- **Owner check:** every callback validates the Telegram user ID matches the task owner before any write.
- **Time:** all scheduling uses `GROUP_TIMEZONE` (IANA, default `Europe/London`), never server TZ. `DailyTask.date` is the group-local calendar date (`@db.Date`); times are `"HH:mm"` strings converted to UTC via DST-safe helpers in `src/core/time.ts`.
- **Multi-step input** (adding/editing titles, "specific time" for `/add`) is stored in `User.pendingAction` (JSON), not in grammY sessions/memory. Status changes are inline-button only.

Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `GROUP_CHAT_ID`, `GROUP_TIMEZONE` (validated with zod in `src/lib/env.ts`; template in `.env.example`).

## Git rules

- Commit after every small, working change (roughly one `PLAN.md` step per commit, smaller if it grows).
- Conventional Commits: `feat|fix|chore|docs|test|refactor(scope): subject`, imperative, ≤72 chars.
- Run typecheck, lint, and tests before committing once they exist. Only `.env.example` is tracked.
