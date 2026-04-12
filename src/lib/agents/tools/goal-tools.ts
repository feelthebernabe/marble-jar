import { db } from "@/lib/db";
import { getValidStravaToken } from "@/lib/strava";

const STRAVA_API_URL = "https://www.strava.com/api/v3";

/**
 * Get a user's Strava activity history for the last N weeks.
 * Returns weekly activity counts and types.
 */
export async function getStravaHistory(
  userId: string,
  weeks: number = 4
): Promise<{
  weeklyStats: { week: string; count: number; types: string[] }[];
  totalActivities: number;
  avgPerWeek: number;
} | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.stravaToken || !user?.stravaRefresh) {
    return null;
  }

  try {
    const tokens = await getValidStravaToken(user.stravaToken, user.stravaRefresh);

    // Persist rotated tokens
    if (tokens.accessToken !== user.stravaToken) {
      await db.user.update({
        where: { id: userId },
        data: {
          stravaToken: tokens.accessToken,
          stravaRefresh: tokens.refreshToken,
        },
      });
    }

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - weeks * 7);
    const after = Math.floor(afterDate.getTime() / 1000);

    const res = await fetch(
      `${STRAVA_API_URL}/athlete/activities?after=${after}&per_page=200`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    );

    if (!res.ok) return null;

    const activities: { start_date: string; type: string }[] = await res.json();

    // Group by week
    const weekMap = new Map<string, { count: number; types: Set<string> }>();
    for (const a of activities) {
      const date = new Date(a.start_date);
      // Week key: YYYY-WNN
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((date.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7
      );
      const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

      const existing = weekMap.get(weekKey) || { count: 0, types: new Set<string>() };
      existing.count++;
      existing.types.add(a.type);
      weekMap.set(weekKey, existing);
    }

    const weeklyStats = Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, data]) => ({
        week,
        count: data.count,
        types: Array.from(data.types),
      }));

    return {
      weeklyStats,
      totalActivities: activities.length,
      avgPerWeek: weeks > 0 ? Math.round((activities.length / weeks) * 10) / 10 : 0,
    };
  } catch (err) {
    console.error("Strava history fetch error:", err);
    return null;
  }
}

/**
 * Get all members of a jar with their Strava connection status.
 */
export async function getJarMembersForGoalSetting(jarId: string) {
  const jar = await db.jar.findUnique({
    where: { id: jarId },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  stravaAthleteId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!jar) return null;

  return {
    jarId: jar.id,
    category: jar.category,
    groupName: jar.group.name,
    members: jar.group.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      hasStrava: !!m.user.stravaAthleteId,
    })),
  };
}

/**
 * Set the group goal on a jar and create approval records for each member.
 */
export async function setGroupGoal(jarId: string, goal: string) {
  const jar = await db.jar.findUnique({
    where: { id: jarId },
    include: {
      group: { include: { members: true } },
    },
  });

  if (!jar) return { success: false, error: "Jar not found" };

  // Update the jar with the proposed goal and move to GOAL_SETTING status
  await db.jar.update({
    where: { id: jarId },
    data: {
      goalDescription: goal,
      status: "GOAL_SETTING",
    },
  });

  // Create approval records for each member
  for (const member of jar.group.members) {
    await db.goalApproval.upsert({
      where: { jarId_userId: { jarId, userId: member.userId } },
      create: { jarId, userId: member.userId },
      update: { approved: false, approvedAt: null },
    });
  }

  return { success: true, goal, memberCount: jar.group.members.length };
}

/**
 * Record a member's approval of the group goal.
 * When all members approve, activate the jar.
 */
export async function approveGoal(jarId: string, userId: string) {
  await db.goalApproval.upsert({
    where: { jarId_userId: { jarId, userId } },
    create: { jarId, userId, approved: true, approvedAt: new Date() },
    update: { approved: true, approvedAt: new Date() },
  });

  // Check if all members have approved
  const allApprovals = await db.goalApproval.findMany({ where: { jarId } });
  const allApproved = allApprovals.every((a) => a.approved);

  if (allApproved) {
    // Activate the jar!
    await db.jar.update({
      where: { id: jarId },
      data: { status: "ACTIVE" },
    });

    return { activated: true, approvalsReceived: allApprovals.length };
  }

  const pending = allApprovals.filter((a) => !a.approved).length;
  return { activated: false, pendingApprovals: pending };
}

/**
 * Post a message to the jar's feed from the goal-setting agent.
 */
export async function postToJarFeed(jarId: string, message: string) {
  return db.feedPost.create({
    data: {
      jarId,
      type: "goal_setting",
      content: message,
    },
  });
}
