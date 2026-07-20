import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { expectedPin, findAppUser } from "@/lib/users";

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: "PIN이 올바르지 않아요." },
      { status: 401 },
    );
  }

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
