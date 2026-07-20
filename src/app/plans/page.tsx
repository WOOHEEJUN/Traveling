import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { PLAN_STATUS_STYLE, planStatusLabel } from "@/lib/plan";
import { tripStyleLabel } from "@/lib/types";
import { nightsLabel } from "@/lib/distance";
import { ChevronRightIcon } from "@/components/icons";

function formatRange(start: Date, end: Date) {
  return `${start.getFullYear()}. ${start.getMonth() + 1}. ${start.getDate()}. – ${
    end.getMonth() + 1
  }월 ${end.getDate()}일`;
}

const GROUPS = [
  { status: "upcoming", label: "예정된 여행" },
  { status: "saved", label: "저장한 여행" },
  { status: "completed", label: "다녀온 여행" },
] as const;

export default async function PlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plans = await prisma.plan.findMany({
    orderBy: { startDate: "desc" },
    include: { savedBy: { select: { name: true } } },
  });

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6">
        <div className="mb-5 px-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            저장함
          </h1>
          <p className="mt-1.5 text-[14px] text-steel">
            저장하거나 확정한 여행을 모아뒀어요.
          </p>
        </div>

        {plans.length === 0 ? (
          <div className="card text-center">
            <p className="text-[14px] text-steel">아직 저장한 여행이 없어요.</p>
            <Link href="/" className="btn btn-primary mt-4 inline-flex">
              코스 추천받기
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {GROUPS.map(({ status, label }) => {
              const group = plans.filter((p) => p.status === status);
              if (group.length === 0) return null;
              const style = PLAN_STATUS_STYLE[status];

              return (
                <section key={status}>
                  <h2 className="mb-2 flex items-center gap-2 px-1">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span className="text-[13px] font-semibold text-charcoal">
                      {label}
                    </span>
                    <span className="text-[12px] text-stone">
                      {group.length}
                    </span>
                  </h2>
                  <ul className="space-y-2">
                    {group.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/plans/${p.id}`}
                          className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[15px] font-semibold text-ink">
                                {p.title}
                              </span>
                              <span className={`badge ${style.chip}`}>
                                {planStatusLabel(p.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-[12px] text-stone">
                              {formatRange(p.startDate, p.endDate)} ·{" "}
                              {nightsLabel(p.nights)} · {p.origin} 출발
                            </p>
                            <p className="mt-0.5 text-[12px] text-stone">
                              {tripStyleLabel(p.style)} · 저장: {p.savedBy.name}
                            </p>
                          </div>
                          <ChevronRightIcon
                            width={16}
                            height={16}
                            className="shrink-0 text-hairline-strong"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
