import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import PlanDetail, { type PlanDetailData } from "@/components/PlanDetail";
import { ArrowLeftIcon } from "@/components/icons";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      savedBy: { select: { name: true } },
      days: {
        orderBy: { dayNumber: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!plan) notFound();

  const data: PlanDetailData = {
    id: plan.id,
    title: plan.title,
    regionName: plan.regionName,
    style: plan.style,
    origin: plan.origin,
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate.toISOString(),
    nights: plan.nights,
    status: plan.status,
    memo: plan.memo,
    rating: plan.rating,
    review: plan.review,
    savedByName: plan.savedBy.name,
    days: plan.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      title: d.title,
      memo: d.memo,
      items: d.items.map((it) => ({
        id: it.id,
        sortOrder: it.sortOrder,
        type: it.type,
        name: it.name,
        address: it.address,
        lat: it.lat,
        lng: it.lng,
        kakaoPlaceUrl: it.kakaoPlaceUrl,
        photoUrl: it.photoUrl,
        note: it.note,
        priceLevel: it.priceLevel,
        visitTime: it.visitTime,
      })),
    })),
  };

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6">
        <Link
          href="/plans"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-steel"
        >
          <ArrowLeftIcon width={15} height={15} />
          저장함
        </Link>
        <PlanDetail plan={data} />
      </main>
      <BottomNav />
    </>
  );
}
