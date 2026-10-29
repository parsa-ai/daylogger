import type { PrismaClient, User } from "@/generated/prisma/client";

type Db = Pick<PrismaClient, "user">;

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export function displayNameOf(from: TelegramUser): string {
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  return name || from.username || `User ${from.id}`;
}

/** Register the user (or refresh their name) and mark them active. */
export function upsertUser(db: Db, from: TelegramUser, chatId: bigint): Promise<User> {
  const displayName = displayNameOf(from);
  return db.user.upsert({
    where: { telegramUserId: BigInt(from.id) },
    create: { telegramUserId: BigInt(from.id), displayName, chatId },
    update: { displayName, chatId, isActive: true },
  });
}

export function findUser(db: Db, telegramUserId: number): Promise<User | null> {
  return db.user.findUnique({ where: { telegramUserId: BigInt(telegramUserId) } });
}
