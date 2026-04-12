import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { PaperCard } from "@/components/ui/paper-card";
import { TapeDivider } from "@/components/ui/tape-divider";
import { Marble } from "@/components/marble/marble";
import { GoalActions } from "@/components/jar/goal-actions";
import Link from "next/link";

export default async function JarSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return notFound();

  const jar = await db.jar.findUnique({
    where: { id },
    include: {
      group: {
        include: {
          members: { include: { user: true } },
        },
      },
      goalApprovals: { include: { user: true } },
      _count: { select: { marbles: true } },
    },
  });

  if (!jar) return notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${appUrl}/onboarding/group?code=${jar.group.inviteCode}`;
  const isActive = jar.status === "ACTIVE";
  const isComplete = jar.status === "COMPLETE";
  const fillPct = jar.capacity > 0
    ? Math.round((jar._count.marbles / jar.capacity) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link
        href={`/jar/${id}`}
        className="font-typewriter text-sm text-ink/50 hover:text-ink"
      >
        ← back to jar
      </Link>

      <h1
        className="font-marker text-4xl text-ink mt-4 mb-1"
        style={{ transform: "rotate(-1deg)" }}
      >
        JAR SETTINGS
      </h1>
      <h2 className="font-archivo text-lg text-punk-pink mb-6">
        {jar.group.name} · {jar.category}
      </h2>

      <TapeDivider index={0} />

      {/* Status */}
      <PaperCard index={0} className="p-5 mb-6">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-3">
          STATUS
        </h3>
        <div className="flex items-center gap-3">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{
              backgroundColor: isComplete
                ? "#2f855a"
                : isActive
                ? "#e8175d"
                : "#d69e2e",
            }}
          />
          <span className="font-marker text-lg text-ink">
            {jar.status}
          </span>
          <span className="font-mono text-xs text-ink/40 ml-auto">
            {jar._count.marbles}/{jar.capacity} ({fillPct}%)
          </span>
        </div>
      </PaperCard>

      {/* Treat */}
      <PaperCard index={1} className="p-5 mb-6">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-3">
          THE TREAT
        </h3>
        <p className="font-marker text-xl text-ink">
          {jar.treatDescription}
        </p>
        {!isActive && !isComplete && (
          <p className="font-typewriter text-xs text-ink/40 mt-2">
            Editable until the jar activates
          </p>
        )}
        {isActive && (
          <p className="font-typewriter text-xs text-ink/40 mt-2">
            🔒 Locked — jar is active
          </p>
        )}
      </PaperCard>

      {/* Goal */}
      <PaperCard index={2} className="p-5 mb-6">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-3">
          THE GOAL
        </h3>
        {jar.goalDescription ? (
          <>
            <p className="font-typewriter text-ink">
              {jar.goalDescription}
            </p>
            {isActive && (
              <p className="font-typewriter text-xs text-ink/40 mt-2">
                🔒 Locked — jar is active
              </p>
            )}
          </>
        ) : (
          <p className="font-typewriter text-sm text-ink/50">
            No goal set yet. The goal-setting agent will help your group decide.
          </p>
        )}

        {/* Goal approvals */}
        {jar.goalApprovals.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="font-archivo text-xs uppercase tracking-wider text-ink/50">
              APPROVALS
            </p>
            {jar.goalApprovals.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {a.approved ? "✓" : "·"}
                </span>
                <span className="font-typewriter text-sm text-ink">
                  {a.user.name}
                </span>
                {a.approvedAt && (
                  <span className="font-mono text-xs text-ink/30 ml-auto">
                    {new Date(a.approvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Goal action buttons */}
        <GoalActions
          jarId={id}
          jarStatus={jar.status}
          hasGoal={!!jar.goalDescription}
          userHasApproved={
            jar.goalApprovals.some(
              (a) => a.userId === authUser!.id && a.approved
            )
          }
        />
      </PaperCard>

      <TapeDivider index={1} />

      {/* Invite Link */}
      <PaperCard index={3} className="p-5 mb-6">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-3">
          INVITE LINK
        </h3>
        <div className="border-3 border-ink bg-kraft-dark p-3 break-all">
          <p className="font-mono text-xs text-ink select-all">
            {inviteLink}
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <p className="font-typewriter text-xs text-ink/50">
            Code: <span className="font-mono font-bold">{jar.group.inviteCode}</span>
          </p>
        </div>
      </PaperCard>

      {/* Members */}
      <PaperCard index={4} className="p-5">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-4">
          MEMBERS ({jar.group.members.length})
        </h3>
        <div className="space-y-3">
          {jar.group.members.map((gm) => (
            <div key={gm.id} className="flex items-center gap-3">
              <Marble
                color={gm.user.marbleColor || "#666"}
                symbol={gm.user.marbleSymbol || "star"}
                size={32}
              />
              <div className="flex-1">
                <span className="font-marker text-lg text-ink">
                  {gm.user.name}
                </span>
                {gm.userId === jar.group.createdById && (
                  <span className="font-typewriter text-xs text-punk-pink ml-2">
                    creator
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-ink/40">
                {new Date(gm.joinedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </PaperCard>
    </div>
  );
}
