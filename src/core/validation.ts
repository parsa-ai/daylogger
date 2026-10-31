export const MAX_TITLE_LENGTH = 100;

export type TitleResult = { ok: true; title: string } | { ok: false; error: string };

export function parseTitle(input: string): TitleResult {
  // Strip control characters and collapse whitespace.
  // eslint-disable-next-line no-control-regex
  const title = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!title) return { ok: false, error: "The title can't be empty." };
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `The title must be at most ${MAX_TITLE_LENGTH} characters.` };
  }
  return { ok: true, title };
}

/** Parses "9", "9:30", "09:30" or "21.15" into "HH:mm"; null if invalid. */
export function parseTime(input: string): string | null {
  const match = /^(\d{1,2})(?:[:.](\d{2}))?$/.exec(input.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
