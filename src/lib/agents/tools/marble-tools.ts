import { db } from "@/lib/db";
import { getUserDayDate } from "@/lib/timezone";

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

export async function logActivityAndMintMarble(userId: string, jarId: string, description: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const today = getUserDayDate(user.timezone);

  const activity = await db.activity.create({
    data: { userId, jarId, source: "sms", status: "CONFIRMED", description },
  });

  try {
    const marble = await db.marble.create({
      data: { jarId, userId, dayDate: today, source: "sms" },
    });
    return { success: true, marble, activity };
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { success: false, error: "Already earned a marble today in this jar", activity };
    }
    throw e;
  }
}
