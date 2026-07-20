import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { searchPhoto, searchPlaceList } from "@/lib/kakao";

/**
 * 장소 검색.
 * 일정에는 실제 존재하는 장소만 넣을 수 있어야 해서, 직접 입력 대신
 * 카카오 검색 결과에서 고르게 합니다.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const places = await searchPlaceList(q, 10);

  // 상위 몇 건만 사진을 붙입니다 (검색할 때마다 10건씩 부르면 낭비라)
  const photos = await Promise.all(
    places
      .slice(0, 6)
      .map((p) =>
        searchPhoto(`${p.name} ${p.category ?? ""}`.trim()).catch(() => null),
      ),
  );

  return NextResponse.json({
    results: places.map((p, i) => ({ ...p, photoUrl: photos[i] ?? null })),
  });
}
