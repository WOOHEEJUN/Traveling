import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import TripCalendar, { type CalendarPlan } from "@/components/TripCalendar";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 캘린더에는 확정(예정) + 완료만 올립니다. 저장만 한 건 저장함에서 봅니다.
  const plans = await prisma.plan.findMany({
    where: { status: { in: ["upcoming", "completed"] } },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      title: true,
      regionName: true,
      startDate: true,
      endDate: true,
      status: true,
      nights: true,
    },
  });

  const data: CalendarPlan[] = plans.map((p) => ({
    id: p.id,
    title: p.title,
    regionName: p.regionName,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    status: p.status,
    nights: p.nights,
  }));

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6">
        <div className="mb-5 px-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            여행 캘린더
          </h1>
          <p className="mt-1.5 text-[14px] text-steel">
            확정한 여행이 날짜별로 표시됩니다.
          </p>
        </div>
        <TripCalendar plans={data} />
      </main>
      <BottomNav />
    </>
  );
}
