import { GrammyError, type Context, type InlineKeyboard } from "grammy";

/** Edit the button's message in place; "not modified" (e.g. double tap) is fine. */
export async function editCallbackMessage(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch (error) {
    if (error instanceof GrammyError && error.description.includes("message is not modified")) return;
    throw error;
  }
}
