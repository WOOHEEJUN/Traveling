import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PLAN_STATUSES } from "@/lib/plan";

/** 여행 정보 수정 (상태 변경, 제목, 메모, 날짜, 후기) */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();

  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: "여행을 찾을 수 없어요." }, { status: 404 });
  }

  const data: {
    status?: string;
    completedAt?: Date | null;
    title?: string;
    memo?: string | null;
    rating?: number | null;
    review?: string | null;
    startDate?: Date;
    endDate?: Date;
    nights?: number;
  } = {};

  if (body.status !== undefined) {
    if (!PLAN_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "잘못된 상태예요." }, { status: 400 });
    }
    data.status = body.status;
    // 완료로 바꿀 때만 완료일을 찍고, 되돌리면 지웁니다
    data.completedAt = body.status === "completed" ? new Date() : null;
  }

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json(
        { error: "제목을 입력해주세요." },
        { status: 400 },
      );
    }
    data.title = title;
  }

  if (body.memo !== undefined) data.memo = body.memo || null;
  if (body.review !== undefined) data.review = body.review || null;

  if (body.rating !== undefined) {
    const n = Number(body.rating);
    if (body.rating === null) {
      data.rating = null;
    } else if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: "별점은 1~5 사이여야 해요." },
        { status: 400 },
      );
    } else {
      data.rating = n;
    }
  }

  if (body.startDate && body.endDate) {
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "날짜 형식이 올바르지 않아요." },
        { status: 400 },
      );
    }
    if (end < start) {
      return NextResponse.json(
        { error: "도착일이 출발일보다 빠를 수 없어요." },
        { status: 400 },
      );
    }
    data.startDate = start;
    data.endDate = end;
    data.nights = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  const updated = await prisma.plan.update({ where: { id }, data });
  return NextResponse.json({ ok: true, plan: { id: updated.id } });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: "여행을 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.plan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
