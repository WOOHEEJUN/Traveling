import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { optimizeDay } from "@/lib/optimize";

/**
 * 이동 동선 재계산.
 * AI를 부르지 않고 좌표만으로 계산해서 비용이 0이고 즉시 끝납니다.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/optimize">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { dayId } = await request.json().catch(() => ({ dayId: undefined }));

  const days = await prisma.planDay.findMany({
    where: { planId: id, ...(dayId ? { id: dayId } : {}) },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (days.length === 0) {
    return NextResponse.json({ error: "일정을 찾을 수 없어요." }, { status: 404 });
  }

  let beforeTotal = 0;
  let afterTotal = 0;
  let reordered = false;
  const updates = [];

  for (const day of days) {
    // 장소가 하나뿐인 날도 방문 시간은 채워줍니다
    if (day.items.length === 0) continue;

    const result = optimizeDay(
      day.items.map((i) => ({
        id: i.id,
        type: i.type,
        name: i.name,
        lat: i.lat,
        lng: i.lng,
      })),
    );

    beforeTotal += result.beforeMinutes;
    afterTotal += result.afterMinutes;

    // 순서가 실제로 바뀌었는지 확인 (안내 문구를 정확히 쓰기 위해)
    const newOrder = [...result.items].sort((a, b) => a.sortOrder - b.sortOrder);
    if (day.items.some((it, i) => newOrder[i]?.id !== it.id)) {
      reordered = true;
    }

    for (const it of result.items) {
      updates.push(
        prisma.planItem.update({
          where: { id: it.id },
          data: { sortOrder: it.sortOrder, visitTime: it.visitTime },
        }),
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
    await prisma.plan.update({ where: { id }, data: { updatedAt: new Date() } });
  }

  return NextResponse.json({
    ok: true,
    beforeMinutes: beforeTotal,
    afterMinutes: afterTotal,
    savedMinutes: Math.max(0, beforeTotal - afterTotal),
    reordered,
  });
}
