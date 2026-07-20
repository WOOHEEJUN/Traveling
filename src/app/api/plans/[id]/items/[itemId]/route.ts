import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

async function findOwnedItem(planId: string, itemId: string) {
  return prisma.planItem.findFirst({
    where: { id: itemId, day: { planId } },
  });
}

/** 방문 시간·메모 수정 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/items/[itemId]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id, itemId } = await ctx.params;
  const item = await findOwnedItem(id, itemId);
  if (!item) {
    return NextResponse.json({ error: "장소를 찾을 수 없어요." }, { status: 404 });
  }

  const body = await request.json();
  const data: { visitTime?: string | null; note?: string | null } = {};

  if (body.visitTime !== undefined) {
    const t = (body.visitTime ?? "").trim();
    if (t && !TIME_PATTERN.test(t)) {
      return NextResponse.json(
        { error: "시간은 09:30 같은 형식으로 입력해주세요." },
        { status: 400 },
      );
    }
    data.visitTime = t || null;
  }

  if (body.note !== undefined) data.note = body.note || null;

  await prisma.planItem.update({ where: { id: itemId }, data });
  await prisma.plan.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}

/** 일정에서 장소 빼기 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/items/[itemId]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id, itemId } = await ctx.params;
  const item = await findOwnedItem(id, itemId);
  if (!item) {
    return NextResponse.json({ error: "장소를 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.planItem.delete({ where: { id: itemId } });
  await prisma.plan.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
