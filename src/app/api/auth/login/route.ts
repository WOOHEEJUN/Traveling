import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { expectedPin, findAppUser } from "@/lib/users";
import {
  checkLoginAttempt,
  clearLoginAttempts,
  clientKey,
  recordLoginFailure,
} from "@/lib/ratelimit";

export async function POST(request: Request) {
  const key = clientKey(request);

  // PIN이 짧아서 자동 대입을 막는 게 중요합니다
  const state = checkLoginAttempt(key);
  if (state.blocked) {
    const minutes = Math.ceil(state.retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `시도가 너무 많아요. ${minutes}분 뒤에 다시 해주세요.` },
      { status: 429, headers: { "Retry-After": String(state.retryAfterSeconds) } },
    );
  }

  const { role, pin } = await request.json();

  const appUser = findAppUser(role);
  if (!appUser) {
    return NextResponse.json(
      { error: "누구인지 선택해주세요." },
      { status: 400 },
    );
  }

  const correctPin = expectedPin(appUser.role);
  if (!correctPin) {
    console.error(`PIN 환경변수가 설정되지 않았습니다: role=${appUser.role}`);
    return NextResponse.json(
      { error: "서버 설정에 문제가 있어요." },
      { status: 500 },
    );
  }

  if (pin !== correctPin) {
    const after = recordLoginFailure(key);
    if (after.blocked) {
      const minutes = Math.ceil(after.retryAfterSeconds / 60);
      return NextResponse.json(
        { error: `시도가 너무 많아요. ${minutes}분 뒤에 다시 해주세요.` },
        {
          status: 429,
          headers: { "Retry-After": String(after.retryAfterSeconds) },
        },
      );
    }
    return NextResponse.json(
      {
        error: `PIN이 올바르지 않아요. (${after.remaining}번 더 틀리면 잠깁니다)`,
      },
      { status: 401 },
    );
  }

  clearLoginAttempts(key);

  const user = await prisma.user.upsert({
    where: { role: appUser.role },
    update: { name: appUser.name },
    create: { role: appUser.role, name: appUser.name },
  });

  const session = await getSession();
  session.userId = user.id;
  session.userName = user.name;
  await session.save();

  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
}
