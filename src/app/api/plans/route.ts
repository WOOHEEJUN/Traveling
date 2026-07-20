import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildDraftDays, defaultPlanTitle } from "@/lib/plan";
import type { ItineraryDay } from "@/lib/types";

function parseItinerary(raw: string | null): ItineraryDay[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 추천 후보를 저장하거나 확정합니다.
 * 이미 같은 후보로 만든 여행이 있으면 새로 만들지 않고 상태만 바꿉니다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { optionId, status } = await request.json();

  if (status !== "saved" && status !== "upcoming") {
    return NextResponse.json({ error: "잘못된 상태예요." }, { status: 400 });
  }

  const option = await prisma.tripOption.findUnique({
    where: { id: optionId },
    include: { trip: true, places: true },
  });
  if (!option) {
    return NextResponse.json({ error: "추천을 찾을 수 없어요." }, { status: 404 });
  }

  // 이미 만들어둔 게 있으면 상태만 갱신 (저장 → 확정 승격)
  const existing = await prisma.plan.findFirst({
    where: { sourceOptionId: optionId },
  });
  if (existing) {
    // 확정은 저장보다 상위 상태이므로 되돌리지 않습니다
    const next =
      existing.status === "completed" || status === "saved"
        ? existing.status
        : status;
    const updated = await prisma.plan.update({
      where: { id: existing.id },
      data: { status: next },
    });
    return NextResponse.json({ ok: true, planId: updated.id, existed: true });
  }

  const { trip } = option;
  const days = buildDraftDays(
    parseItinerary(option.itinerary),
    option.places,
    trip.nights,
    option.regionName,
  );

  const plan = await prisma.plan.create({
    data: {
      title: defaultPlanTitle(option.regionName),
      regionName: option.regionName,
      style: trip.style,
      origin: trip.origin,
      startDate: trip.startDate,
      endDate: trip.endDate,
      nights: trip.nights,
      status,
      memo: option.stayAreaNote,
      savedById: user.id,
      sourceOptionId: option.id,
      days: {
        create: days.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          memo: d.memo,
          items: { create: d.items },
        })),
      },
    },
  });

  return NextResponse.json({ ok: true, planId: plan.id, existed: false });
}
