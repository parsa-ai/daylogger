import { z } from "zod";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

type Db = Pick<PrismaClient, "user">;

// Multi-step text input (PLAN.md D5). `promptMessageId` is the bot message the
// user must reply to, so unrelated group chatter is never taken as input.
const base = { promptMessageId: z.number().int() };

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("addRecurringTitle"), ...base }),
  z.object({ kind: z.literal("addRecurringTime"), title: z.string(), ...base }),
  z.object({ kind: z.literal("editTitle"), taskId: z.string(), ...base }),
  z.object({ kind: z.literal("editTime"), taskId: z.string(), ...base }),
]);

export type PendingAction = z.infer<typeof schema>;

/** A pending action before its prompt message has been sent. */
export type PendingInput = PendingAction extends infer T
  ? T extends unknown
    ? Omit<T, "promptMessageId">
    : never
  : never;

/** Parse the stored JSON; anything unrecognised is treated as no pending action. */
export function parsePendingAction(value: unknown): PendingAction | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

export async function setPendingAction(db: Db, userId: string, action: PendingAction): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { pendingAction: action } });
}

export async function clearPendingAction(db: Db, userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { pendingAction: Prisma.DbNull } });
}
