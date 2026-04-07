import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

export async function notifyBuddy(userId: string, jarId: string, message: string, mediaUrl?: string) {
  const jar = await db.jar.findUnique({
    where: { id: jarId },
    include: {
      group: { include: { members: { include: { user: true }, where: { userId: { not: userId } } } } },
    },
  });
  if (!jar || jar.group.members.length === 0) return null;

  const buddyIndex = Date.now() % jar.group.members.length;
  const buddy = jar.group.members[buddyIndex];

  await sendSms(buddy.user.phone, message, mediaUrl);

  const latestActivity = await db.activity.findFirst({
    where: { userId, jarId },
    orderBy: { loggedAt: "desc" },
  });

  if (latestActivity) {
    await db.buddyNotification.create({
      data: { activityId: latestActivity.id, buddyId: buddy.userId, message, mediaUrl },
    });
  }

  return { buddyName: buddy.user.name, sent: true };
}

export async function sendCreativeMessage(userId: string, targetName: string, message: string, mediaUrl?: string) {
  const memberships = await db.groupMember.findMany({
    where: { userId },
    include: { group: { include: { members: { include: { user: true } } } } },
  });

  let targetUser = null;
  for (const m of memberships) {
    const found = m.group.members.find(
      (gm) => gm.user.name.toLowerCase() === targetName.toLowerCase()
    );
    if (found) { targetUser = found.user; break; }
  }

  if (!targetUser) return { sent: false, error: `Couldn't find "${targetName}" in your groups` };

  await sendSms(targetUser.phone, message, mediaUrl);
  return { sent: true, targetName: targetUser.name };
}

export async function sendReply(phone: string, message: string) {
  await sendSms(phone, message);
  return { sent: true };
}
