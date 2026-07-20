import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import HistoryView, { type HistoryTrip } from "@/components/HistoryView";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trips = await prisma.trip.findMany({
    orderBy: { startDate: "desc" },
    include: {
      createdBy: { select: { name: true } },
      options: {
        select: {
          id: true,
          regionName: true,
          summary: true,
          estDriveMinutes: true,
          isChosen: true,
        },
        orderBy: { estDriveMinutes: "asc" },
      },
    },
  });

  const data: HistoryTrip[] = trips.map((t) => ({
    id: t.id,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate.toISOString(),
    nights: t.nights,
    origin: t.origin,
    budgetTheme: t.budgetTheme,
    status: t.status,
    createdByName: t.createdBy.name,
    options: t.options,
  }));

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-5 px-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            지난 추천
          </h1>
          <p className="mt-1.5 text-[14px] text-steel">
            그동안 받았던 추천들을 다시 볼 수 있어요.
          </p>
        </div>
        <HistoryView trips={data} />
      </main>
    </>
  );
}
