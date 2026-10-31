export const MAX_TITLE_LENGTH = 100;

export type TitleResult = { ok: true; title: string } | { ok: false; reason: "empty" | "tooLong" };

export function parseTitle(input: string): TitleResult {
  // Strip control characters (keeping ZWNJ, which Persian needs) and collapse whitespace.
  const title = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!title) return { ok: false, reason: "empty" };
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, reason: "tooLong" };
  return { ok: true, title };
}

/** Persian (۰–۹) and Arabic-Indic (٠–٩) digits → ASCII. */
export function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Parses "9", "9:30", "09:30", "21.15", or the same in Persian digits with
 * Persian separators ("۹٫۳۰", "۲۱:۱۵") into "HH:mm"; null if invalid.
 */
export function parseTime(input: string): string | null {
  const normalized = toAsciiDigits(input.trim()).replace(/[٫،]/g, ":");
  const match = /^(\d{1,2})(?:[:.](\d{2}))?$/.exec(normalized);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Words that stop a reply-prompt flow. */
const CANCEL_WORDS = new Set(["cancel", "لغو", "انصراف", "بیخیال"]);

export function isCancel(input: string): boolean {
  return CANCEL_WORDS.has(input.trim().toLowerCase().replace(/\u200c/g, ""));
}
