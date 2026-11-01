import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { payouts, users, type Payout, type User } from "@shared/schema.mysql";
import { getSettingInt, isMissingTable, queryRows } from "@/lib/core/sql-utils";

/**
 * Payout requests reserve their points.
 *
 * Previously a request never touched the balance: the same points could be
 * requested any number of times, and approving one didn't deduct anything.
 * Now the points come off the balance when the request is made (recorded in
 * payout_holds, scripts/sql/009), are returned if it's rejected, and stay
 * gone when it's completed. Level is left alone, cashing out shouldn't
 * demote anyone.
 *
 * Requests made before payout_holds existed have no hold; completing one
 * deducts its points then, rejecting it changes nothing.
 */

export class PayoutError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function holdsEnabled(): Promise<boolean> {
  try {
    await queryRows(sql`SELECT payout_id FROM payout_holds LIMIT 1`);
    return true;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

export async function requestPayout(user: User, input: { amount: number; paymentMethod: string; paymentDetails: string | null }): Promise<Payout> {
  const { amount } = input;
  const minimum = await getSettingInt("minimum_points_to_withdraw", 0);
  if (minimum > 0 && amount < minimum) {
    throw new PayoutError(`The minimum withdrawal is ${minimum.toLocaleString()} points`, 400, "BELOW_MINIMUM");
  }
  if (amount > user.points) {
    throw new PayoutError(`You have ${user.points.toLocaleString()} points available`, 400, "INSUFFICIENT_POINTS");
  }

  const reserve = await holdsEnabled();

  return db.transaction(async (tx) => {
    const [open] = (await tx.execute(
      sql`SELECT id FROM payouts WHERE user_id = ${user.id} AND status IN ('pending', 'processing') LIMIT 1 FOR UPDATE`
    )) as unknown as [{ id: number }[]];
    if (open.length) {
      throw new PayoutError("You already have a withdrawal being processed. Wait for it to finish first.", 409, "PAYOUT_OPEN");
    }

    if (reserve) {
      // Conditional decrement: fails cleanly if the balance moved underneath us.
      const [res] = (await tx.execute(
        sql`UPDATE users SET points = points - ${amount}, updated_at = NOW() WHERE id = ${user.id} AND points >= ${amount}`
      )) as unknown as [{ affectedRows: number }];
      if (res.affectedRows !== 1) throw new PayoutError("Not enough points for this withdrawal", 400, "INSUFFICIENT_POINTS");
    }

    const [ins] = await tx.insert(payouts).values({
      userId: user.id,
      amount,
      status: "pending",
      paymentMethod: input.paymentMethod,
      paymentDetails: input.paymentDetails,
      requestedAt: new Date(),
      processedAt: null,
      processedBy: null,
    });
    const payoutId = (ins as unknown as { insertId: number }).insertId;

    if (reserve) {
      await tx.execute(sql`INSERT INTO payout_holds (payout_id, user_id, amount) VALUES (${payoutId}, ${user.id}, ${amount})`);
    }

    const [payout] = await tx.select().from(payouts).where(eq(payouts.id, payoutId));
    return payout;
  });
}

/** Applies the balance side of an admin status change. Call before saving the new status. */
export async function settlePayout(payout: Payout, status: string): Promise<void> {
  if (status !== "completed" && status !== "rejected") return;
  if (!(await holdsEnabled())) return;

  await db.transaction(async (tx) => {
    const [rows] = (await tx.execute(
      sql`SELECT amount, released FROM payout_holds WHERE payout_id = ${payout.id} FOR UPDATE`
    )) as unknown as [{ amount: number; released: number }[]];
    const hold = rows[0];

    if (hold) {
      if (hold.released) return;
      await tx.execute(sql`UPDATE payout_holds SET released = 1 WHERE payout_id = ${payout.id}`);
      if (status === "rejected") {
        await tx.update(users).set({ points: sql`${users.points} + ${hold.amount}` }).where(eq(users.id, payout.userId));
      }
      return;
    }

    // Legacy request with nothing reserved: take the points when it's paid.
    if (status === "completed") {
      await tx.update(users).set({ points: sql`GREATEST(${users.points} - ${payout.amount}, 0)` }).where(eq(users.id, payout.userId));
      await tx.execute(sql`INSERT INTO payout_holds (payout_id, user_id, amount, released) VALUES (${payout.id}, ${payout.userId}, ${payout.amount}, 1)`);
    }
  });
}
