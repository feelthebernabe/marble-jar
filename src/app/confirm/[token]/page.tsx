import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUserDayDate } from "@/lib/timezone";
import { PaperCard } from "@/components/ui/paper-card";
import { Marble } from "@/components/marble/marble";

/**
 * One-tap witness confirmation page.
 * When a user texts about a meditation/manual activity, a witness
 * gets sent a link like /confirm/abc123. Tapping it confirms the activity
 * and mints the marble.
 */
export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Find the witness record by token
  const witness = await db.witness.findUnique({
    where: { token },
    include: {
      activity: {
        include: {
          user: true,
          jar: { include: { group: true } },
        },
      },
      witness: true,
    },
  });

  if (!witness) return notFound();

  const activity = witness.activity;
  const activityUser = activity.user;

  // Already confirmed?
  if (witness.confirmedAt) {
    return (
      <div className="min-h-screen bg-kraft flex flex-col items-center justify-center px-4">
        <PaperCard index={0} className="max-w-sm w-full p-8 text-center">
          <div className="flex justify-center mb-4">
            <Marble
              color={activityUser.marbleColor || "#666"}
              symbol={activityUser.marbleSymbol || "star"}
              size={64}
            />
          </div>
          <h1 className="font-marker text-2xl text-ink mb-2">
            Already Confirmed
          </h1>
          <p className="font-typewriter text-sm text-ink/60">
            You already confirmed {activityUser.name}&apos;s activity. The marble
            has been dropped!
          </p>
        </PaperCard>
      </div>
    );
  }

  // Confirm the activity: update witness, update activity status, mint marble
  const now = new Date();
  const dayDate = getUserDayDate(activityUser.timezone);

  await db.witness.update({
    where: { token },
    data: { confirmedAt: now },
  });

  await db.activity.update({
    where: { id: activity.id },
    data: { status: "CONFIRMED" },
  });

  // Mint the marble (dedup via unique constraint)
  let marbleMinted = true;
  try {
    await db.marble.create({
      data: {
        jarId: activity.jarId,
        userId: activity.userId,
        dayDate,
        source: `witness:${witness.id}`,
      },
    });
  } catch (e: unknown) {
    // Unique constraint = already minted today
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      marbleMinted = false;
    } else {
      throw e;
    }
  }

  return (
    <div className="min-h-screen bg-kraft flex flex-col items-center justify-center px-4">
      <PaperCard index={2} className="max-w-sm w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <Marble
            color={activityUser.marbleColor || "#666"}
            symbol={activityUser.marbleSymbol || "star"}
            size={80}
          />
        </div>
        <h1
          className="font-marker text-3xl text-ink mb-2"
          style={{ transform: "rotate(-1deg)" }}
        >
          CONFIRMED ✓
        </h1>
        <p className="font-typewriter text-sm text-ink/70 mb-2">
          You confirmed {activityUser.name}&apos;s activity:
        </p>
        <p className="font-archivo text-ink mb-4">
          &ldquo;{activity.description || "daily goal"}&rdquo;
        </p>
        {marbleMinted ? (
          <p className="font-typewriter text-sm text-punk-pink">
            🎱 Marble dropped into the {activity.jar.group.name} jar!
          </p>
        ) : (
          <p className="font-typewriter text-sm text-ink/50">
            (They already earned a marble for today)
          </p>
        )}
      </PaperCard>
    </div>
  );
}
