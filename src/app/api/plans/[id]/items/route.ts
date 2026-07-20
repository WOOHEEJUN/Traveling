import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PLACE_TYPES } from "@/lib/types";

/** 일정에 장소 추가 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/items">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const { dayId, type, name, address, lat, lng, kakaoPlaceUrl, photoUrl } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "장소를 선택해주세요." }, { status: 400 });
  }
  if (!PLACE_TYPES.some((t) => t.key === type)) {
    return NextResponse.json({ error: "분류를 선택해주세요." }, { status: 400 });
  }

  // 이 여행에 속한 날짜인지 확인
  const day = await prisma.planDay.findFirst({
    where: { id: dayId, planId: id },
    include: { _count: { select: { items: true } } },
  });
  if (!day) {
    return NextResponse.json({ error: "날짜를 찾을 수 없어요." }, { status: 404 });
  }

  const item = await prisma.planItem.create({
    data: {
      dayId: day.id,
      sortOrder: day._count.items,
      type,
      name: name.trim(),
      address: address ?? null,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      kakaoPlaceUrl: kakaoPlaceUrl ?? null,
      photoUrl: photoUrl ?? null,
    },
  });

  await prisma.plan.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true, itemId: item.id });
}

/** 순서 일괄 변경 (드래그 후 저장) */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/items">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { items } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  // 다른 여행의 항목을 건드리지 못하도록 소속을 먼저 확인
  const owned = await prisma.planItem.findMany({
    where: { day: { planId: id } },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((o) => o.id));

  const days = await prisma.planDay.findMany({
    where: { planId: id },
    select: { id: true },
  });
  const dayIds = new Set(days.map((d) => d.id));

  const updates = (items as { id: string; dayId: string; sortOrder: number }[])
    .filter((it) => ownedIds.has(it.id) && dayIds.has(it.dayId))
    .map((it) =>
      prisma.planItem.update({
        where: { id: it.id },
        data: { dayId: it.dayId, sortOrder: it.sortOrder },
      }),
    );

  await prisma.$transaction(updates);
  await prisma.plan.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true, updated: updates.length });
}
