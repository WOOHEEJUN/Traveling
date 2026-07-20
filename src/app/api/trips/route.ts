import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { planTrip } from "@/lib/claude";
import { searchPhotos, searchPlace, searchPlaces } from "@/lib/kakao";
import {
  DEFAULT_ORIGIN,
  ORIGIN_PRESETS,
  estimateDriveMinutes,
  maxOneWayMinutes,
} from "@/lib/distance";
import { TRIP_STYLES } from "@/lib/types";

// Claude 호출이 길어질 수 있어 여유를 둡니다.
export const maxDuration = 300;

function nightsBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const { startDate, endDate, origin, style, wantsDessert } = body;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "여행 날짜를 선택해주세요." },
      { status: 400 },
    );
  }
  if (!TRIP_STYLES.some((t) => t.key === style)) {
    return NextResponse.json(
      { error: "여행 스타일을 선택해주세요." },
      { status: 400 },
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
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

  const nights = nightsBetween(start, end);
  if (nights > 6) {
    return NextResponse.json(
      { error: "최대 6박까지 추천할 수 있어요." },
      { status: 400 },
    );
  }

  const originName: string = origin?.trim() || DEFAULT_ORIGIN.name;
  const allowedMinutes = maxOneWayMinutes(nights);

  // 출발지 좌표 — 프리셋에 없으면 카카오로 검색
  const preset = ORIGIN_PRESETS.find((o) => o.name === originName);
  const originCoord = preset
    ? { lat: preset.lat, lng: preset.lng }
    : ((await searchPlace(originName)) ?? DEFAULT_ORIGIN);

  // 같은 곳만 계속 추천하지 않도록 최근 이력을 전달
  const recent = await prisma.tripOption.findMany({
    where: { trip: { createdById: user.id } },
    select: { regionName: true },
    orderBy: { trip: { createdAt: "desc" } },
    take: 6,
  });
  const recentRegions = [...new Set(recent.map((r) => r.regionName))];

  let planned;
  try {
    planned = await planTrip({
      origin: originName,
      startDate,
      endDate,
      nights,
      style,
      wantsDessert: Boolean(wantsDessert),
      maxOneWayMinutes: allowedMinutes,
      recentRegions,
    });
  } catch (e) {
    console.error("여행 추천 생성 실패", e);
    const message =
      e instanceof Error ? e.message : "추천을 만드는 중 문제가 생겼어요.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const trip = await prisma.trip.create({
    data: {
      createdById: user.id,
      startDate: start,
      endDate: end,
      nights,
      origin: originName,
      style,
      wantsDessert: Boolean(wantsDessert),
    },
  });

  // 각 후보마다 지역 좌표로 이동시간 계산 + 장소 정보 보강
  for (const option of planned) {
    const regionPlace = await searchPlace(option.searchKeyword);
    const estDriveMinutes = regionPlace
      ? estimateDriveMinutes(originCoord, regionPlace)
      : allowedMinutes;

    const created = await prisma.tripOption.create({
      data: {
        tripId: trip.id,
        regionName: option.regionName,
        summary: option.summary,
        stayAreaNote: option.stayAreaNote,
        estDriveMinutes,
        itinerary: JSON.stringify(option.itinerary ?? []),
      },
    });

    const keywords = option.places.map((p) => p.searchKeyword);
    const [found, photos] = await Promise.all([
      searchPlaces(keywords),
      searchPhotos(keywords),
    ]);

    await prisma.place.createMany({
      data: option.places.map((p, i) => {
        const hit = found[i];
        return {
          optionId: created.id,
          type: p.type,
          name: p.name,
          address: hit?.address ?? null,
          lat: hit?.lat ?? null,
          lng: hit?.lng ?? null,
          kakaoPlaceUrl: hit?.placeUrl ?? null,
          photoUrl: photos[i],
          note: p.note,
          priceLevel: p.priceLevel,
        };
      }),
    });
  }

  return NextResponse.json({ ok: true, tripId: trip.id });
}
