import { db } from "@/lib/db";

export async function getFavoritesPot(groupId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { members: { select: { userId: true } } },
  });
  if (!group) return [];

  const userIds = group.members.map((m) => m.userId);
  const favorites = await db.favorite.findMany({
    where: { userId: { in: userIds } },
    include: { user: { select: { name: true } } },
  });

  return favorites.map((f) => ({ category: f.category, value: f.value, addedBy: f.user.name }));
}

export async function addFavorite(userId: string, category: string, value: string) {
  const favorite = await db.favorite.create({ data: { userId, category, value } });
  return { id: favorite.id, category, value };
}
