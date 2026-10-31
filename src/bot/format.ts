export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** An HTML mention that notifies the user even without a username. */
export function mention(telegramUserId: bigint | number, name: string): string {
  return `<a href="tg://user?id=${telegramUserId}">${escapeHtml(name)}</a>`;
}

/** ASCII digits → Persian digits (۰–۹) for display, e.g. "10:30" → "۱۰:۳۰". */
export function fa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** A 10-cell progress bar, e.g. 70% → 🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜. */
export function progressBar(percent: number, cells = 10): string {
  const filled = Math.round((Math.min(Math.max(percent, 0), 100) / 100) * cells);
  return "🟩".repeat(filled) + "⬜".repeat(cells - filled);
}

/** A local "YYYY-MM-DD" date in the Persian (Solar Hijri) calendar, e.g. "چهارشنبه ۱۰ تیر". */
export function persianDate(date: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
