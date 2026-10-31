# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phases 1–4 (setup, Telegram integration, recurring tasks, reminders) done; next is Phase 5 (one-time tasks, step 22). See the numbered steps in the plan:

- `docs/PRODEUCT.md` — product requirements (source of truth; filename typo is intentional/kept).
- `docs/PLAN.md` — design decisions (D1–D13), Prisma schema, reminder state machine, and the numbered step list. Work through steps in order and update this file as real commands/structure appear.

Do not expand scope beyond `PRODEUCT.md` §21 (MVP) — §22 lists explicitly excluded features (no dashboard, Redis, workers, multi-group, streaks, etc.).

## Stack

Next.js (App Router) + TypeScript, grammY, Prisma on Neon Postgres (`@prisma/adapter-neon`), Vercel + Vercel Cron, pnpm, vitest.

## Commands

```bash
pnpm install                   # also runs `prisma generate` (postinstall)
pnpm dev                       # next dev
pnpm typecheck && pnpm lint && pnpm test   # run before every commit
pnpm vitest run src/lib/env.test.ts        # single test file
pnpm vitest run -t "test name"             # single test by name
pnpm db:migrate                # prisma migrate dev (uses DIRECT_URL)
pnpm db:deploy                 # prisma migrate deploy
```

If `tsc` reports errors that contradict `tsconfig.json`, delete `tsconfig.tsbuildinfo` (stale incremental cache).

## Version notes

- **Next.js 16** — APIs differ from older versions; see `AGENTS.md` and read `node_modules/next/dist/docs/` before writing route/framework code.
- **Prisma 7** — generator is `prisma-client` with output `src/generated/prisma` (gitignored; import from `@/generated/prisma/client`). The datasource URL lives in `prisma.config.ts` (DIRECT_URL, CLI only); runtime uses the Neon driver adapter in `src/lib/db.ts`. Keep the `prisma` CLI and `@prisma/client` on the same 7.x version (`pnpm add -D prisma` alone may pull an 8.x RC).
- `env()` and `db()` are lazy functions, so `next build` works without secrets. Never read `process.env` directly elsewhere.

## Architecture (big picture)

Serverless only — **no `setTimeout`/`setInterval`, in-memory queues, or process state**. All state lives in Postgres.

Two entry points:
- `src/app/api/telegram/route.ts` — webhook. Checks `X-Telegram-Bot-Api-Secret-Token`, dedups by `update_id` via `ProcessedUpdate` insert-or-skip, ignores chats other than `GROUP_CHAT_ID`, then hands off to the grammY bot (`src/bot/`).
- `src/app/api/cron/route.ts` — called every 5 min (`vercel.json`, requires Vercel Pro or an external pinger), guarded by `Authorization: Bearer $CRON_SECRET`. `runTick` (`src/core/tick.ts`): finalize past days → generate today → finalize due → at ≥ `REPORT_TIME` close the day → send due reminders (`src/core/delivery.ts`, Telegram side injected via `ReminderSender` in `src/bot/sender.ts`). Report publishing is added in Phase 6.

Business logic lives in `src/core/` and takes `now` + a db client (and an injected sender where it talks to Telegram) so it is testable without Telegram; `src/bot/` is a thin Telegram layer. Reminder buttons use `dt:<done|later>:<dailyTaskId>` (`src/bot/reminderCallbacks.ts`).

Key invariants (see `docs/PLAN.md` for detail):
- **Definitions vs. instances:** `RecurringTask` is copied into `DailyTask` (title, reminderTime) at generation. Editing/deleting a definition never touches existing `DailyTask` rows; changes apply from the next day. Recurring tasks are soft-deleted.
- **Idempotency via DB:** `@@unique([recurringTaskId, date])` for generation; `DailyReport.date` primary key inserted *before* sending; reminders are sent only after winning a conditional "claim" update (`WHERE reminderCount = k AND status = PENDING`); button handlers use guarded updates so repeat clicks are no-ops.
- **Reminder state machine:** `reminderCount` 0→1 at T, 2 at T+1h, 3 at T+2h, then finalize to `INCOMPLETE` at +1h; driven by `DailyTask.nextReminderAt` (UTC). Nothing is sent after the cutoff (`21:30`, configurable) or after the report. Owner may still mark `COMPLETED` later the same day.
- **Owner check:** every callback validates the Telegram user ID matches the task owner before any write.
- **Time:** all scheduling uses `GROUP_TIMEZONE` (IANA, default `Europe/London`), never server TZ. `DailyTask.date` is the group-local calendar date (`@db.Date`); times are `"HH:mm"` strings converted to UTC via DST-safe helpers in `src/core/time.ts`.
- **Multi-step input** (adding/editing titles, "specific time" for `/add`) is stored in `User.pendingAction` (JSON, zod-validated in `src/core/pending.ts`), not in grammY sessions/memory. The bot sends a selective force-reply prompt and only accepts a text that *replies to that prompt's message id* (works with privacy mode on; ignores normal chatter). Status changes are inline-button only.
- **Callback data** is `rt:<action>:<target>` (`src/bot/callbackData.ts`, 64-byte limit); `src/bot/callbacks.ts` routes it and answers each callback exactly once.

Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `GROUP_CHAT_ID`, `GROUP_TIMEZONE` (validated with zod in `src/lib/env.ts`; template in `.env.example`).

## Git rules

- Commit after every small, working change (roughly one `PLAN.md` step per commit, smaller if it grows).
- Conventional Commits: `feat|fix|chore|docs|test|refactor(scope): subject`, imperative, ≤72 chars.
- Run typecheck, lint, and tests before committing once they exist. Only `.env.example` is tracked.
