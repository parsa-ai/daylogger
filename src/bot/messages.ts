import { MAX_ONE_TIME_PER_DAY } from "@/core/oneTime";
import { MAX_RECURRING_TASKS } from "@/core/recurring";
import { MAX_TITLE_LENGTH, type TitleResult } from "@/core/validation";
import type { RecurringTask } from "@/generated/prisma/client";
import { escapeHtml, fa } from "./format";

// All user-facing text, in Persian. Texts used in callback toasts
// (answerCallbackQuery) are plain text — no HTML tags there.

const b = (text: string) => `<b>${escapeHtml(text)}</b>`;
const appliesTomorrow = "<i>🗓 تغییرات از فردا اعمال می‌شن.</i>";
const cancelHint = "<i>برای انصراف بنویس «لغو».</i>";

export const messages = {
  welcome: (name: string) =>
    `سلام ${b(name)} جان! 🌸\n\n` +
    `من دستیار کارهای روزانه‌ی این گروهم ✨\n` +
    `هر روز سرِ ساعتِ هر کار همین‌جا ازت می‌پرسم انجامش دادی یا نه، ` +
    `و آخر شب یه گزارش کوچولو برای همه می‌فرستم 📊\n\n` +
    `برای شروع، کارهای روزانه‌ت رو با /tasks بساز 🌱`,

  help:
    `🌼 <b>راهنمای من</b>\n\n` +
    `یک بار کارهای روزانه‌ت رو بساز، بقیه‌ش با من!\n` +
    `⏰ سرِ ساعتِ هر کار ازت می‌پرسم\n` +
    `🔔 اگه جواب ندی، تا دو بار دیگه یادت می‌ندازم\n` +
    `📊 آخر شب گزارش گروه رو می‌فرستم\n\n` +
    `<b>دستورها</b>\n` +
    `/start — عضو شدن\n` +
    `/tasks — کارهای روزانه‌ی من\n` +
    `/add &lt;عنوان&gt; — یه کار یه‌باره برای امروز\n` +
    `/report — وضعیت امروز گروه\n` +
    `/help — همین راهنما`,

  privateChat: "من توی گروه کار می‌کنم 🙂 لطفاً اون‌جا صدام کن!",

  unknownGroup: (chatId: number) =>
    `🛠 این گروه هنوز تنظیم نشده.\n<code>GROUP_CHAT_ID=${chatId}</code> رو تنظیم کن و دوباره دیپلوی کن.`,

  notRegistered: "اول یه /start بزن تا با هم آشنا بشیم 🌱",

  // /tasks
  taskList: (name: string, tasks: RecurringTask[]) => {
    const header = `🗂 <b>کارهای روزانه‌ی ${escapeHtml(name)}</b>\n\n`;
    if (tasks.length === 0) {
      return header + "هنوز هیچ کاری نساختی 🌱\nبا دکمه‌ی «➕ کار جدید» اولین کارت رو بساز!";
    }
    const lines = tasks.map(
      (t) =>
        `${t.isActive ? "🟢" : "⏸"} <b>${fa(t.reminderTime)}</b> — ${escapeHtml(t.title)}` +
        (t.isActive ? "" : " <i>(متوقف)</i>"),
    );
    return header + lines.join("\n") + `\n\nروی هر کار بزن تا مدیریتش کنی ✨\n${appliesTomorrow}`;
  },

  taskDetail: (task: RecurringTask) =>
    `📌 ${b(task.title)}\n\n` +
    `⏰ ساعت: <b>${fa(task.reminderTime)}</b>\n` +
    `${task.isActive ? "🟢 وضعیت: فعال" : "⏸ وضعیت: متوقف"}\n\n` +
    appliesTomorrow,

  confirmDelete: (task: RecurringTask) =>
    `🗑 مطمئنی می‌خوای ${b(task.title)} (${fa(task.reminderTime)}) رو حذف کنی؟\n` +
    `<i>روزهای قبل و گزارش‌ها دست نمی‌خورن.</i>`,

  notOwner: (name: string) => `فقط ${name} می‌تونه این کارها رو مدیریت کنه 🙈`,
  taskGone: "این کار دیگه وجود نداره 🍃",
  taskLimit: `حداکثر ${fa(MAX_RECURRING_TASKS)} کار روزانه می‌تونی داشته باشی 🙏`,

  // Text input prompts (reply-to-message flows)
  askTitle: (who: string) => `${who}، اسم کار جدیدت چیه؟ ✍️\nجوابش رو روی همین پیام بفرست.\n${cancelHint}`,
  askTime: (who: string, title: string) =>
    `${who}، هر روز چه ساعتی درباره‌ی ${b(title)} ازت بپرسم؟ ⏰\n` +
    `مثلاً <code>۱۰:۰۰</code> یا <code>۲۱:۱۵</code>\n${cancelHint}`,
  invalidTime: "😅 این ساعت درست نیست؛ مثل <code>۱۰:۳۰</code> بنویس.",
  timeAfterCutoff: (cutoff: string) => `یادآوری‌ها ساعت ${fa(cutoff)} تموم می‌شن 🌙 یه ساعت زودتر انتخاب کن.`,
  inputCancelled: "باشه، لغو شد 👌",
  titleError: (reason: Extract<TitleResult, { ok: false }>["reason"]) =>
    reason === "empty" ? "😅 اسم کار نمی‌تونه خالی باشه." : `✂️ اسم کار حداکثر ${fa(MAX_TITLE_LENGTH)} حرف می‌تونه باشه.`,

  taskAdded: (title: string, time: string) =>
    `🎉 ${b(title)} برای ساعت <b>${fa(time)}</b> اضافه شد!\n🗓 از فردا شروع می‌شه.`,

  askNewTitle: (who: string, current: string) => `${who}، اسم جدیدِ ${b(current)} چی باشه؟ ✏️\n${cancelHint}`,
  askNewTime: (who: string, task: RecurringTask) =>
    `${who}، ساعت جدیدِ ${b(task.title)} چند باشه؟ ⏰ (الان: ${fa(task.reminderTime)})\n` +
    `مثلاً <code>۱۰:۰۰</code>\n${cancelHint}`,
  titleUpdated: (title: string) => `✏️ اسمش شد ${b(title)}.\n${appliesTomorrow}`,
  timeUpdated: (title: string, time: string) => `⏰ ساعتِ ${b(title)} شد <b>${fa(time)}</b>.\n${appliesTomorrow}`,

  // Reminders (attempt 1 = initial, 2–3 = follow-ups)
  reminder: (who: string, title: string, attempt: number) => {
    if (attempt <= 1) return `☀️ ${who} جان، ${b(title)} رو امروز انجام دادی؟`;
    if (attempt === 2) return `🔔 یادآوری: ${who} جان، ${b(title)} چی شد؟ هنوز وقت هست 💪`;
    return `⏰ آخرین یادآوری: ${who} جان، ${b(title)} رو انجام دادی؟`;
  },

  reminderCompleted: (who: string, title: string, at: string) =>
    `✅ آفرین ${who}! ${b(title)} ساعت ${fa(at)} انجام شد 🎉`,
  reminderNotYet: (who: string, title: string, nextAt: string | null) =>
    `⏳ ${who} هنوز ${b(title)} رو انجام نداده.\n` +
    (nextAt
      ? `ساعت ${fa(nextAt)} دوباره سر می‌زنم 🌱`
      : "امروز دیگه یادآوری نمی‌کنم؛ هر وقت انجامش دادی دکمه‌ی زیر رو بزن 🌙"),

  reminderIncomplete: (who: string, title: string) =>
    `🌧 ${who}، ${b(title)} امروز انجام نشد.\n` +
    `اگه آخرش انجامش دادی، تا آخر امروز می‌تونی دکمه‌ی زیر رو بزنی 🫶`,

  notTaskOwner: (name: string) => `فقط ${name} می‌تونه جواب این رو بده 🙈`,
  toastCompleted: "آفرین! 🎉",
  toastNotYet: "باشه، بعداً دوباره می‌پرسم ⏳",
  toastAlreadyCompleted: "قبلاً انجام شده ✅",
  toastTaskClosed: "این کار دیگه بسته شده 🍃",

  // /add (one-time tasks)
  askOneTimeTitle: (who: string) =>
    `${who}، چه کاری رو می‌خوای اضافه کنی؟ 📝\nاسمش رو روی همین پیام جواب بده.\n${cancelHint}`,
  oneTimeAdded: (title: string) => `📝 ${b(title)} به کارهای امروز اضافه شد!\nکِی یادت بندازم؟ ⏰`,
  oneTimeScheduled: (title: string, time: string) =>
    `📝 ${b(title)}\n⏰ ساعت <b>${fa(time)}</b> ازت می‌پرسم.\nزودتر تموم شد؟ دکمه‌ی زیر رو بزن ✨`,
  oneTimeNoReminder: (title: string) =>
    `📝 ${b(title)}\n🔕 بدون یادآوری. هر وقت انجامش دادی دکمه‌ی زیر رو بزن ✨`,
  askOneTimeTime: (who: string, title: string, cutoff: string) =>
    `${who}، امروز چه ساعتی درباره‌ی ${b(title)} بپرسم؟ ⏰\n` +
    `مثلاً <code>۱۶:۳۰</code> (تا ساعت ${fa(cutoff)})\n${cancelHint}`,
  oneTimeAfterReport: "گزارش امروز فرستاده شده 🌙 این کار رو فردا اضافه کن.",
  oneTimeLimit: `امروز حداکثر ${fa(MAX_ONE_TIME_PER_DAY)} کار یه‌باره می‌تونی اضافه کنی 🙏`,
  timeInPast: "این ساعت گذشته 🙃 یه ساعت دیگه انتخاب کن.",
  toastReminderAlreadySet: "یادآوری قبلاً تنظیم شده ✅",

  toastActivated: "فعال شد 🟢 از فردا",
  toastPaused: "متوقف شد ⏸ از فردا",
  toastDeleted: "حذف شد 🗑",
};
