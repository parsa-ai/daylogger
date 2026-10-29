import type { PrismaClient } from "@/generated/prisma/client";

type Db = Pick<PrismaClient, "processedUpdate">;

/** Returns true if this call is the first to see the update. */
export async function claimUpdate(db: Db, updateId: number): Promise<boolean> {
  const { count } = await db.processedUpdate.createMany({
    data: [{ updateId: BigInt(updateId) }],
    skipDuplicates: true,
  });
  return count === 1;
}

/** Undo a claim so Telegram's retry of a failed update is processed. */
export async function releaseUpdate(db: Db, updateId: number): Promise<void> {
  await db.processedUpdate.deleteMany({ where: { updateId: BigInt(updateId) } });
}
