"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KakaoMap from "./KakaoMap";
import { PLACE_TYPES, type ItineraryDay } from "@/lib/types";
import { formatDriveTime } from "@/lib/distance";
import { photoSrc } from "@/lib/photo";
import {
  BedIcon,
  CakeIcon,
  CarIcon,
  CheckIcon,
  CompassIcon,
  ForkKnifeIcon,
  HeartIcon,
} from "./icons";

export interface ResultPlace {
  id: string;
  type: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  kakaoPlaceUrl: string | null;
  photoUrl: string | null;
  note: string | null;
  priceLevel: string | null;
}

export interface ResultOption {
  id: string;
  regionName: string;
  summary: string;
  stayAreaNote: string | null;
  estDriveMinutes: number;
  itinerary: string | null;
  isChosen: boolean;
  places: ResultPlace[];
  /** 이 후보로 이미 만든 여행 (저장/확정) */
  plan: { id: string; status: string } | null;
}

const TYPE_ICON: Record<string, typeof BedIcon> = {
  stay: BedIcon,
  food: ForkKnifeIcon,
  dessert: CakeIcon,
  activity: CompassIcon,
};

const TYPE_TINT: Record<string, string> = {
  stay: "bg-tint-lavender text-cat-stay",
  food: "bg-tint-peach text-cat-food",
  dessert: "bg-tint-rose text-cat-dessert",
  activity: "bg-tint-mint text-cat-activity",
};

function parseItinerary(raw: string | null): ItineraryDay[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function TripResult({
  tripId,
  options,
}: {
  tripId: string;
  options: ResultOption[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(
    options.find((o) => o.isChosen)?.id ?? options[0]?.id ?? null,
  );
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * 저장/확정 시 추천 후보를 편집 가능한 여행으로 복사합니다.
   * 원본 추천은 그대로 남아서 "지난 추천"에서 계속 볼 수 있습니다.
   */
  async function createPlan(optionId: string, status: "saved" | "upcoming") {
    setBusyId(optionId);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, status }),
      });
      const data = await res.json();
      if (!res.ok) return;

      if (status === "upcoming") {
        // 확정하면 원본 추천에도 표시를 남기고 상세로 이동
        await fetch(`/api/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionId }),
        });
        router.push(`/plans/${data.planId}`);
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (options.length === 0) {
    return (
      <p className="card text-[14px] text-steel">
        추천 결과가 비어 있어요. 조건을 바꿔서 다시 시도해주세요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const open = openId === option.id;
        const itinerary = parseItinerary(option.itinerary);

        return (
          <article
            key={option.id}
            className={`overflow-hidden rounded-lg border bg-canvas transition-colors ${
              option.isChosen ? "border-primary" : "border-hairline"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : option.id)}
              aria-expanded={open}
              className="flex w-full items-start justify-between gap-3 p-5 text-left"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold tracking-tight text-ink">
                    {option.regionName}
                  </span>
                  {option.isChosen && (
                    <span className="badge bg-primary text-on-primary">
                      확정
                    </span>
                  )}
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-stone">
                  <CarIcon width={14} height={14} />
                  편도 약 {formatDriveTime(option.estDriveMinutes)}
                </span>
                <span className="mt-2.5 block text-[13px] leading-relaxed text-slate">
                  {option.summary}
                </span>
              </span>
              <span
                className={`mt-1 shrink-0 text-stone transition-transform ${
                  open ? "rotate-90" : ""
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </span>
            </button>

            {open && (
              <div className="border-t border-hairline-soft">
                {/* 지도 */}
                <div className="h-[260px] w-full sm:h-[320px]">
                  <KakaoMap
                    places={option.places.map((p) => ({
                      id: p.id,
                      type: p.type,
                      name: p.name,
                      lat: p.lat,
                      lng: p.lng,
                      note: p.note,
                      photoUrl: p.photoUrl,
                      kakaoPlaceUrl: p.kakaoPlaceUrl,
                      priceLevel: p.priceLevel,
                    }))}
                    focusedId={focusedPlaceId}
                    onSelect={setFocusedPlaceId}
                  />
                </div>

                <div className="space-y-5 p-5">
                  {option.stayAreaNote && (
                    <section>
                      <h3 className="mb-1.5 text-[13px] font-semibold text-charcoal">
                        숙소는 이 근처로
                      </h3>
                      <p className="text-[13px] leading-relaxed text-slate">
                        {option.stayAreaNote}
                      </p>
                    </section>
                  )}

                  {itinerary.length > 0 && (
                    <section>
                      <h3 className="mb-2.5 text-[13px] font-semibold text-charcoal">
                        코스
                      </h3>
                      <ol className="space-y-3">
                        {itinerary.map((day) => (
                          <li key={day.day} className="flex gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-slate">
                              {day.day}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-medium text-ink">
                                {day.title}
                              </span>
                              <span className="mt-1 block text-[13px] leading-relaxed text-slate">
                                {day.detail}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  {/* 장소 목록 */}
                  {PLACE_TYPES.map((type) => {
                    const items = option.places.filter(
                      (p) => p.type === type.key,
                    );
                    if (items.length === 0) return null;
                    const Icon = TYPE_ICON[type.key];

                    return (
                      <section key={type.key}>
                        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-charcoal">
                          <Icon width={15} height={15} />
                          {type.label}
                        </h3>
                        <ul className="space-y-2">
                          {items.map((place) => (
                            <li
                              key={place.id}
                              onMouseEnter={() => setFocusedPlaceId(place.id)}
                              onClick={() => setFocusedPlaceId(place.id)}
                              className={`cursor-pointer rounded-md border p-3 transition-colors ${
                                focusedPlaceId === place.id
                                  ? "border-primary bg-primary-soft/40"
                                  : "border-hairline-soft bg-surface-soft"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {place.photoUrl && (
                                  // 카카오 이미지 검색 썸네일 (외부 도메인이라 next/image 대신 img 사용)
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={photoSrc(place.photoUrl)!}
                                    alt=""
                                    loading="lazy"
                                    className="h-16 w-16 shrink-0 rounded-md bg-surface object-cover"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[14px] font-medium text-ink">
                                      {place.name}
                                    </span>
                                    {place.priceLevel && (
                                      <span
                                        className={`tag ${TYPE_TINT[type.key]}`}
                                      >
                                        {place.priceLevel}
                                      </span>
                                    )}
                                  </p>
                                  {place.address && (
                                    <p className="mt-0.5 text-[12px] text-stone">
                                      {place.address}
                                    </p>
                                  )}
                                  {place.note && (
                                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate">
                                      {place.note}
                                    </p>
                                  )}
                                </div>
                                {place.kakaoPlaceUrl && (
                                  <a
                                    href={place.kakaoPlaceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-slate"
                                  >
                                    지도
                                  </a>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}

                  {/* 저장 / 확정 */}
                  {option.plan ? (
                    <Link
                      href={`/plans/${option.plan.id}`}
                      className="btn btn-secondary w-full"
                    >
                      {option.plan.status === "saved"
                        ? "저장함에서 보기"
                        : "확정한 여행 보기"}
                    </Link>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => createPlan(option.id, "saved")}
                        disabled={busyId === option.id}
                        className="btn btn-secondary flex-1"
                      >
                        <HeartIcon width={16} height={16} />
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => createPlan(option.id, "upcoming")}
                        disabled={busyId === option.id}
                        className="btn btn-primary flex-1"
                      >
                        <CheckIcon width={16} height={16} />
                        이 코스로 정하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
