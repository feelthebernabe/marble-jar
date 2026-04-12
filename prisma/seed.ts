import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.reaction.deleteMany();
  await prisma.feedPost.deleteMany();
  await prisma.buddyNotification.deleteMany();
  await prisma.witness.deleteMany();
  await prisma.marble.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.goalApproval.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.agentMemory.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.jar.deleteMany();
  await prisma.group.deleteMany();
  await prisma.retryQueue.deleteMany();
  await prisma.user.deleteMany();

  const michelle = await prisma.user.create({
    data: {
      email: "michelle@example.com",
      name: "Michelle",
      phone: "+15551234567",
      marbleColor: "#e53935",
      marbleSymbol: "star",
      onboardingStep: 7,
    },
  });

  const elli = await prisma.user.create({
    data: {
      email: "elli@example.com",
      name: "Elli",
      phone: "+15559876543",
      marbleColor: "#1565c0",
      marbleSymbol: "moon",
      onboardingStep: 7,
    },
  });

  const jake = await prisma.user.create({
    data: {
      email: "jake@example.com",
      name: "Jake",
      phone: "+15555551234",
      marbleColor: "#2e7d32",
      marbleSymbol: "lightning",
      onboardingStep: 7,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah@example.com",
      name: "Sarah",
      phone: "+15555554321",
      marbleColor: "#8e24aa",
      marbleSymbol: "flame",
      onboardingStep: 7,
    },
  });

  const group = await prisma.group.create({
    data: {
      name: "Michelle & Friends",
      inviteCode: "marble-crew-2026",
      createdById: michelle.id,
    },
  });

  for (const user of [michelle, elli, jake, sarah]) {
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id },
    });
  }

  const workoutJar = await prisma.jar.create({
    data: {
      groupId: group.id,
      category: "WORKOUT",
      status: "ACTIVE",
      goalDescription: "1 workout per day",
      treatDescription: "Group dinner at that new ramen place",
      capacity: 60,
    },
  });

  const meditationJar = await prisma.jar.create({
    data: {
      groupId: group.id,
      category: "MEDITATION",
      status: "ACTIVE",
      goalDescription: "10 minutes meditation",
      treatDescription: "Spa day",
      capacity: 40,
    },
  });

  const users = [michelle, elli, jake, sarah];
  const today = new Date();

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dayDate = date.toISOString().split("T")[0];
    for (const user of users) {
      if (Math.random() < 0.7) {
        await prisma.marble.create({
          data: { jarId: workoutJar.id, userId: user.id, dayDate, source: "sms", earnedAt: date },
        });
      }
    }
  }

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dayDate = date.toISOString().split("T")[0];
    for (const user of users) {
      if (Math.random() < 0.5) {
        await prisma.marble.create({
          data: { jarId: meditationJar.id, userId: user.id, dayDate, source: "sms", earnedAt: date },
        });
      }
    }
  }

  const favorites = [
    { userId: michelle.id, category: "show", value: "Succession" },
    { userId: michelle.id, category: "poet", value: "Mary Oliver" },
    { userId: michelle.id, category: "movie", value: "Spirited Away" },
    { userId: elli.id, category: "show", value: "Seinfeld" },
    { userId: elli.id, category: "book", value: "Educated by Tara Westover" },
    { userId: jake.id, category: "movie", value: "Rocky" },
    { userId: jake.id, category: "music", value: "Kendrick Lamar" },
    { userId: sarah.id, category: "poet", value: "Rumi" },
    { userId: sarah.id, category: "show", value: "The Office" },
  ];

  for (const fav of favorites) {
    await prisma.favorite.create({ data: fav });
  }

  const workoutCount = await prisma.marble.count({ where: { jarId: workoutJar.id } });
  const meditationCount = await prisma.marble.count({ where: { jarId: meditationJar.id } });

  console.log(`Seeded: 4 users, 1 group, 2 jars`);
  console.log(`Workout jar: ${workoutCount}/${workoutJar.capacity} marbles`);
  console.log(`Meditation jar: ${meditationCount}/${meditationJar.capacity} marbles`);
  console.log(`9 favorites added`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
