// Inline button payloads, `<prefix>:<action>:<target>`. Telegram limits
// callback_data to 64 bytes; ids are cuids (~25 chars) and Telegram user ids
// are ≤ 20 digits.

/** Recurring-task list actions (`rt:`); the target is the owner's Telegram user id. */
const listActions = ["list", "add"] as const;
/** Recurring-task actions (`rt:`); the target is the recurring task id. */
const taskActions = ["open", "title", "time", "toggle", "del", "delok"] as const;
/** Reminder answers (`dt:`); the target is the daily task id. */
const dailyActions = ["done", "later"] as const;
/** Reminder choice for a new one-time task (`ot:`); the target is the daily task id. */
const oneTimeActions = ["in30", "in60", "at", "none"] as const;

export type ListAction = (typeof listActions)[number];
export type TaskAction = (typeof taskActions)[number];
export type DailyAction = (typeof dailyActions)[number];
export type OneTimeAction = (typeof oneTimeActions)[number];

export type CallbackData =
  | { scope: "list"; action: ListAction; ownerId: number }
  | { scope: "task"; action: TaskAction; taskId: string }
  | { scope: "daily"; action: DailyAction; taskId: string }
  | { scope: "oneTime"; action: OneTimeAction; taskId: string };

export const cb = {
  list: (action: ListAction, ownerId: number) => `rt:${action}:${ownerId}`,
  task: (action: TaskAction, taskId: string) => `rt:${action}:${taskId}`,
  daily: (action: DailyAction, taskId: string) => `dt:${action}:${taskId}`,
  oneTime: (action: OneTimeAction, taskId: string) => `ot:${action}:${taskId}`,
};

const isOneOf = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value);

const isId = (value: string) => /^[a-z0-9]+$/i.test(value);

export function parseCallbackData(data: string): CallbackData | null {
  const [prefix, action, target, ...rest] = data.split(":");
  if (!action || !target || rest.length > 0) return null;

  if (prefix === "rt") {
    if (isOneOf(listActions, action)) {
      return /^\d+$/.test(target) ? { scope: "list", action, ownerId: Number(target) } : null;
    }
    if (isOneOf(taskActions, action)) {
      return isId(target) ? { scope: "task", action, taskId: target } : null;
    }
  }
  if (prefix === "dt" && isOneOf(dailyActions, action)) {
    return isId(target) ? { scope: "daily", action, taskId: target } : null;
  }
  if (prefix === "ot" && isOneOf(oneTimeActions, action)) {
    return isId(target) ? { scope: "oneTime", action, taskId: target } : null;
  }
  return null;
}
