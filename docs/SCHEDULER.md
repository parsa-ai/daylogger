# Scheduler (free setup)

The bot needs `/api/cron` called regularly: each call ("tick") creates today's
tasks, sends due reminders, closes unanswered tasks and (from Phase 6) posts the
22:00 report. Every step is idempotent, so extra, overlapping or missed calls
are safe — a missed call is simply caught up by the next one.

Vercel **Hobby** only allows daily crons (a `*/5` cron in `vercel.json` fails
the deploy), so this project has **no Vercel cron**. A free external pinger
calls the endpoint instead.

## cron-job.org (free)

1. Sign up at <https://cron-job.org> and create a cronjob.
2. **URL:** `https://<your-app>.vercel.app/api/cron`
3. **Schedule:** custom — every **10 minutes**, hours **06–23** (see below).
   Set the job's **time zone** to your `GROUP_TIMEZONE` (e.g. `Europe/London`).
4. **Advanced → Headers:** add `Authorization` = `Bearer <CRON_SECRET>`.
   Method `GET`.
5. Save, then use **Test run** — it should return `200` with JSON like
   `{"generated":0,"finalized":0,"reminders":{"sent":0,"skipped":0,"failed":0}}`.
   `401` means the header/secret is wrong; `503` means `GROUP_CHAT_ID` is unset.

You can run the same call yourself: `pnpm cron:tick https://<your-app>.vercel.app`
(or with no argument against `pnpm dev`).

## Why every 10 minutes, 06:00–23:00

- **Neon free tier:** the database scales to zero after ~5 minutes idle, and the
  free plan has a monthly compute-hours allowance. A ping every 5 minutes, 24h a
  day, keeps it awake permanently and can exhaust that allowance. Pinging every
  10 minutes lets it sleep between ticks, and skipping the night roughly halves
  usage again. Check your usage in the Neon console after the first week.
- **Accuracy:** a reminder goes out on the first tick at/after its time, so up to
  ~10 minutes late. Follow-ups and finalization are scheduled from the actual
  send time, so the cadence holds.
- **Hours:** the window must include the report time (22:00) so the report goes
  out. Tasks with a reminder before 06:00 are sent at the first tick of the
  day. Day rollover needs no midnight tick — the first morning tick creates the
  day's tasks and closes any left over from yesterday.

If your Neon usage has headroom, every 5 minutes gives tighter reminders; the
code doesn't care which interval you pick.

## Function limits (Vercel Hobby)

The cron route sets `maxDuration = 60` and handles at most 50 reminders per
tick; anything beyond that is picked up on the next tick.
