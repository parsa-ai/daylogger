import { formatInTimeZone, fromZonedTime, getTimezoneOffset } from "date-fns-tz";

// All scheduling is in the group timezone (never the server's).
// A "local date" is "YYYY-MM-DD"; a time of day is "HH:mm".

const HOUR_MS = 60 * 60 * 1000;

/** The group-local calendar date at `now`. */
export function localDate(now: Date, timeZone: string): string {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd");
}

/** The group-local time of day at `now`. */
export function localTime(now: Date, timeZone: string): string {
  return formatInTimeZone(now, timeZone, "HH:mm");
}

/**
 * The UTC instant of a local date + time, DST-safe:
 * - a time skipped by spring-forward (e.g. 01:30 in London) moves forward by the gap (→ 02:30);
 * - an ambiguous fall-back time resolves to one of its two occurrences (date-fns-tz's choice).
 */
export function toUtc(date: string, time: string, timeZone: string): Date {
  const candidate = fromZonedTime(`${date}T${time}:00`, timeZone);
  if (formatInTimeZone(candidate, timeZone, "yyyy-MM-dd HH:mm") === `${date} ${time}`) return candidate;

  // In a gap: the pre-transition offset lands just after the transition.
  const naive = Date.parse(`${date}T${time}:00Z`);
  const offsetBefore = getTimezoneOffset(timeZone, new Date(candidate.getTime() - 12 * HOUR_MS));
  return new Date(naive - offsetBefore);
}

/** The UTC instant at which the local date begins. */
export function startOfLocalDay(date: string, timeZone: string): Date {
  return toUtc(date, "00:00", timeZone);
}

/** A local date as stored in a Prisma `@db.Date` column (UTC midnight). */
export function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** Compare two "HH:mm" strings (zero-padded, so lexical order is time order). */
export function isTimeAfter(a: string, b: string): boolean {
  return a > b;
}
