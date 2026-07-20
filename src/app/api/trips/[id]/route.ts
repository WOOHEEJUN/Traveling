import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** 여러 후보 중 하나를 확정 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/trips/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { optionId } = await request.json();

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { options: { select: { id: true } } },
  });
  if (!trip) {
    return NextResponse.json({ error: "여행을 찾을 수 없어요." }, { status: 404 });
  }
  if (!trip.options.some((o) => o.id === optionId)) {
    return NextResponse.json(
      { error: "이 여행에 없는 후보예요." },
      { status: 400 },
    );
  }

  // 한 번에 하나만 확정되도록 나머지는 해제
  await prisma.$transaction([
    prisma.tripOption.updateMany({
      where: { tripId: id },
      data: { isChosen: false },
    }),
    prisma.tripOption.update({
      where: { id: optionId },
      data: { isChosen: true },
    }),
    prisma.trip.update({
      where: { id },
      data: { status: "confirmed" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
