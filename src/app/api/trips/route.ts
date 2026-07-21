import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { planDestination, planTrip } from "@/lib/claude";
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

  const mode: string = body.mode === "destination" ? "destination" : "recommend";
  const isOverseas = mode === "destination" && Boolean(body.isOverseas);
  const destination: string = (body.destination ?? "").trim();

  if (mode === "destination" && !destination) {
    return NextResponse.json(
      { error: "가고싶은 곳을 입력해주세요." },
      { status: 400 },
    );
  }

  // 해외는 인천공항에서 출발 (자차 이동 개념이 없음)
  const originName: string = isOverseas
    ? "인천공항"
    : origin?.trim() || DEFAULT_ORIGIN.name;
  const allowedMinutes = maxOneWayMinutes(nights);

  if (mode === "destination") {
    return handleDestination({
      userId: user.id,
      destination,
      isOverseas,
      originName,
      startDate,
      endDate,
      start,
      end,
      nights,
      style,
      wantsDessert: Boolean(wantsDessert),
    });
  }

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

    await createPlaces(created.id, option.places, true);
  }

  return NextResponse.json({ ok: true, tripId: trip.id });
}

/**
 * 장소 정보 보강 후 저장.
 * 해외는 카카오 로컬 검색이 안 되므로 좌표 없이 사진만 붙입니다
 * (이미지 검색은 해외 장소도 나오는 경우가 많음).
 */
async function createPlaces(
  optionId: string,
  places: { type: string; name: string; searchKeyword: string; note: string; priceLevel: string }[],
  searchLocal: boolean,
) {
  const keywords = places.map((p) => p.searchKeyword);
  const [found, photos] = await Promise.all([
    searchLocal ? searchPlaces(keywords) : Promise.resolve(keywords.map(() => null)),
    searchPhotos(keywords),
  ]);

  await prisma.place.createMany({
    data: places.map((p, i) => {
      const hit = found[i];
      return {
        optionId,
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

/** 목적지 직접 지정 모드: 정해진 곳의 일정 하나를 만들어 저장 */
async function handleDestination(args: {
  userId: string;
  destination: string;
  isOverseas: boolean;
  originName: string;
  startDate: string;
  endDate: string;
  start: Date;
  end: Date;
  nights: number;
  style: string;
  wantsDessert: boolean;
}) {
  let planned;
  try {
    planned = await planDestination({
      destination: args.destination,
      isOverseas: args.isOverseas,
      origin: args.originName,
      startDate: args.startDate,
      endDate: args.endDate,
      nights: args.nights,
      style: args.style,
      wantsDessert: args.wantsDessert,
    });
  } catch (e) {
    console.error("목적지 일정 생성 실패", e);
    const message =
      e instanceof Error ? e.message : "일정을 만드는 중 문제가 생겼어요.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const trip = await prisma.trip.create({
    data: {
      createdById: args.userId,
      startDate: args.start,
      endDate: args.end,
      nights: args.nights,
      origin: args.originName,
      style: args.style,
      wantsDessert: args.wantsDessert,
      mode: "destination",
      isOverseas: args.isOverseas,
      destination: args.destination,
    },
  });

  // 국내면 출발지→목적지 이동시간 계산, 해외는 자차 개념이 없어 0
  let estDriveMinutes = 0;
  if (!args.isOverseas) {
    const preset = ORIGIN_PRESETS.find((o) => o.name === args.originName);
    const originCoord = preset
      ? { lat: preset.lat, lng: preset.lng }
      : ((await searchPlace(args.originName)) ?? DEFAULT_ORIGIN);
    const regionPlace = await searchPlace(planned.searchKeyword);
    if (regionPlace) {
      estDriveMinutes = estimateDriveMinutes(originCoord, regionPlace);
    }
  }

  const created = await prisma.tripOption.create({
    data: {
      tripId: trip.id,
      regionName: planned.regionName,
      summary: planned.summary,
      stayAreaNote: planned.stayAreaNote,
      estDriveMinutes,
      itinerary: JSON.stringify(planned.itinerary ?? []),
      overseasInfo: planned.overseas ? JSON.stringify(planned.overseas) : null,
    },
  });

  await createPlaces(created.id, planned.places, !args.isOverseas);

  return NextResponse.json({ ok: true, tripId: trip.id });
}
