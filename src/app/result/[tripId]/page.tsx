import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import TripResult from "@/components/TripResult";
import { tripStyleLabel } from "@/lib/types";
import { nightsLabel } from "@/lib/distance";
import { ArrowLeftIcon } from "@/components/icons";

function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      options: {
        include: { places: true },
        orderBy: { estDriveMinutes: "asc" },
      },
    },
  });

  if (!trip) notFound();

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-steel"
        >
          <ArrowLeftIcon width={15} height={15} />
          조건 다시 정하기
        </Link>

        <div className="mb-5 px-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            이 중에 골라볼까요
          </h1>
          <p className="mt-1.5 text-[13px] text-steel">
            {trip.origin} 출발 · {formatDate(trip.startDate)}–
            {formatDate(trip.endDate)} · {nightsLabel(trip.nights)} ·{" "}
            {tripStyleLabel(trip.style)}
          </p>
        </div>

        <TripResult
          tripId={trip.id}
          options={trip.options.map((o) => ({
            id: o.id,
            regionName: o.regionName,
            summary: o.summary,
            stayAreaNote: o.stayAreaNote,
            estDriveMinutes: o.estDriveMinutes,
            itinerary: o.itinerary,
            isChosen: o.isChosen,
            places: o.places.map((p) => ({
              id: p.id,
              type: p.type,
              name: p.name,
              address: p.address,
              lat: p.lat,
              lng: p.lng,
              kakaoPlaceUrl: p.kakaoPlaceUrl,
              note: p.note,
              priceLevel: p.priceLevel,
            })),
          }))}
        />
      </main>
    </>
  );
}
