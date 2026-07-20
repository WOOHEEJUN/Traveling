import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** 하루치 제목·메모 수정 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/days/[dayId]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id, dayId } = await ctx.params;
  const day = await prisma.planDay.findFirst({ where: { id: dayId, planId: id } });
  if (!day) {
    return NextResponse.json({ error: "날짜를 찾을 수 없어요." }, { status: 404 });
  }

  const body = await request.json();
  const data: { title?: string | null; memo?: string | null } = {};
  if (body.title !== undefined) data.title = body.title?.trim() || null;
  if (body.memo !== undefined) data.memo = body.memo || null;

  await prisma.planDay.update({ where: { id: dayId }, data });
  await prisma.plan.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
