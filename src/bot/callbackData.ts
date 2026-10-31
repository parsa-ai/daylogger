// Inline button payloads. Telegram limits callback_data to 64 bytes;
// ids are cuids (~25 chars) and Telegram user ids are ≤ 20 digits.

/** Actions on a user's task list; the target is the owner's Telegram user id. */
const listActions = ["list", "add"] as const;
/** Actions on one recurring task; the target is the task id. */
const taskActions = ["open", "title", "time", "toggle", "del", "delok"] as const;

export type ListAction = (typeof listActions)[number];
export type TaskAction = (typeof taskActions)[number];

export type CallbackData =
  | { scope: "list"; action: ListAction; ownerId: number }
  | { scope: "task"; action: TaskAction; taskId: string };

export const cb = {
  list: (action: ListAction, ownerId: number) => `rt:${action}:${ownerId}`,
  task: (action: TaskAction, taskId: string) => `rt:${action}:${taskId}`,
};

export function parseCallbackData(data: string): CallbackData | null {
  const [prefix, action, target, ...rest] = data.split(":");
  if (prefix !== "rt" || !action || !target || rest.length > 0) return null;

  if ((listActions as readonly string[]).includes(action)) {
    if (!/^\d+$/.test(target)) return null;
    return { scope: "list", action: action as ListAction, ownerId: Number(target) };
  }
  if ((taskActions as readonly string[]).includes(action)) {
    if (!/^[a-z0-9]+$/i.test(target)) return null;
    return { scope: "task", action: action as TaskAction, taskId: target };
  }
  return null;
}
