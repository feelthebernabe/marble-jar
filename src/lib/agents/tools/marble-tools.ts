import { db } from "@/lib/db";
import { getUserDayDate } from "@/lib/timezone";
import { requestWitness } from "./witness-tools";

export async function getActiveJars(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const memberships = await db.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          jars: { where: { status: "ACTIVE" }, include: { _count: { select: { marbles: true } } } },
        },
      },
    },
  });

  const today = getUserDayDate(user.timezone);
  const jars = [];
  for (const membership of memberships) {
    for (const jar of membership.group.jars) {
      const todaysMarble = await db.marble.findUnique({
        where: { jarId_userId_dayDate: { jarId: jar.id, userId, dayDate: today } },
      });
      jars.push({
        id: jar.id,
        groupName: membership.group.name,
        groupId: membership.group.id,
        category: jar.category,
        goalDescription: jar.goalDescription,
        treatDescription: jar.treatDescription,
        marbleCount: jar._count.marbles,
        capacity: jar.capacity,
        alreadyMintedToday: !!todaysMarble,
      });
    }
  }
  return jars;
}

/**
 * Log an activity and handle marble minting.
 *
 * - WORKOUT jars with Strava: auto-confirmed (handled by webhook, not here)
 * - SMS-logged activities: create PENDING activity + request witness confirmation.
 *   The marble is minted when the witness confirms via /confirm/[token].
 */
export async function logActivityAndMintMarble(userId: string, jarId: string, description: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const today = getUserDayDate(user.timezone);

  // Check if already minted today
  const existing = await db.marble.findUnique({
    where: { jarId_userId_dayDate: { jarId, userId, dayDate: today } },
  });
  if (existing) {
    return { success: false, error: "Already earned a marble today in this jar" };
  }

  // Create activity as PENDING — needs witness confirmation
  const activity = await db.activity.create({
    data: { userId, jarId, source: "sms", status: "PENDING", description },
  });

  // Request witness confirmation
  const witnessResult = await requestWitness(activity.id);

  if (witnessResult) {
    return {
      success: true,
      status: "pending_witness",
      witnessName: witnessResult.witnessName,
      activity,
    };
  }

  // No other members to witness — auto-confirm (solo group edge case)
  await db.activity.update({
    where: { id: activity.id },
    data: { status: "CONFIRMED" },
  });

  try {
    const marble = await db.marble.create({
      data: { jarId, userId, dayDate: today, source: "sms" },
    });
    return { success: true, status: "auto_confirmed", marble, activity };
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { success: false, error: "Already earned a marble today in this jar", activity };
    }
    throw e;
  }
}
