export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** An HTML mention that notifies the user even without a username. */
export function mention(telegramUserId: bigint | number, name: string): string {
  return `<a href="tg://user?id=${telegramUserId}">${escapeHtml(name)}</a>`;
}
