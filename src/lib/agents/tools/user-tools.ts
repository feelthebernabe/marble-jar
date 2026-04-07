import { db } from "@/lib/db";

export async function getUserByPhone(phone: string) {
  return db.user.findFirst({
    where: { phone },
    include: {
      groupMembers: {
        include: {
          group: {
            include: {
              members: { include: { user: { select: { id: true, name: true, phone: true } } } },
              jars: { where: { status: "ACTIVE" } },
            },
          },
        },
      },
    },
  });
}

export async function getJarMemberStats(userId: string, jarId: string) {
  const jar = await db.jar.findUnique({
    where: { id: jarId },
    include: {
      group: { include: { members: { include: { user: true } } } },
      marbles: { orderBy: { dayDate: "desc" }, take: 100 },
    },
  });
  if (!jar) return null;

  const today = new Date().toISOString().split("T")[0];
  const totalMarbles = jar.marbles.length;
  const fillPercent = Math.round((totalMarbles / jar.capacity) * 100);

  const members = jar.group.members.map((m) => {
    const userMarbles = jar.marbles.filter((mb) => mb.userId === m.userId);
    const doneToday = userMarbles.some((mb) => mb.dayDate === today);
    return { name: m.user.name, doneToday, recentMarbles: userMarbles.length };
  });

  return { totalMarbles, capacity: jar.capacity, fillPercent, members };
}
