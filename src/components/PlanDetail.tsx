"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KakaoMap from "./KakaoMap";
import { PLACE_TYPES } from "@/lib/types";
import { tripStyleLabel } from "@/lib/types";
import { nightsLabel } from "@/lib/distance";
import { PLAN_STATUS_STYLE, planStatusLabel } from "@/lib/plan";
import { photoSrc } from "@/lib/photo";
import {
  BedIcon,
  CakeIcon,
  CheckIcon,
  CompassIcon,
  ForkKnifeIcon,
  TrashIcon,
} from "./icons";

export interface PlanDetailItem {
  id: string;
  sortOrder: number;
  type: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  kakaoPlaceUrl: string | null;
  photoUrl: string | null;
  note: string | null;
  priceLevel: string | null;
  visitTime: string | null;
}

export interface PlanDetailData {
  id: string;
  title: string;
  regionName: string;
  style: string;
  origin: string;
  startDate: string;
  endDate: string;
  nights: number;
  status: string;
  memo: string | null;
  rating: number | null;
  review: string | null;
  savedByName: string;
  days: {
    id: string;
    dayNumber: number;
    title: string | null;
    memo: string | null;
    items: PlanDetailItem[];
  }[];
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

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PlanDetail({ plan }: { plan: PlanDetailData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [memo, setMemo] = useState(plan.memo ?? "");
  const [memoSaved, setMemoSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const style = PLAN_STATUS_STYLE[plan.status] ?? PLAN_STATUS_STYLE.saved;
  const allItems = plan.days.flatMap((d) => d.items);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
      return res.ok;
    } finally {
      setBusy(false);
    }
  }

  async function saveMemo() {
    if (memo === (plan.memo ?? "")) return;
    setMemoSaved("saving");
    const ok = await patch({ memo });
    setMemoSaved(ok ? "saved" : "idle");
    if (ok) setTimeout(() => setMemoSaved("idle"), 2000);
  }

  async function handleDelete() {
    if (!confirm(`"${plan.title}"을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(true);
    const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/plans");
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <section className="card">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">
            {plan.title}
          </h1>
          <span className={`badge ${style.chip}`}>
            {planStatusLabel(plan.status)}
          </span>
        </div>
        <p className="mt-2 text-[13px] text-steel">
          {plan.origin} 출발 · {formatDate(plan.startDate)}–
          {formatDate(plan.endDate)} · {nightsLabel(plan.nights)} ·{" "}
          {tripStyleLabel(plan.style)}
        </p>
        <p className="mt-1 text-[12px] text-stone">저장: {plan.savedByName}</p>

        {/* 상태 전환 버튼 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {plan.status === "saved" && (
            <button
              type="button"
              onClick={() => patch({ status: "upcoming" })}
              disabled={busy}
              className="btn btn-primary flex-1"
            >
              <CheckIcon width={16} height={16} />
              여행 확정하기
            </button>
          )}
          {plan.status === "upcoming" && (
            <>
              <button
                type="button"
                onClick={() => patch({ status: "completed" })}
                disabled={busy}
                className="btn btn-primary flex-1"
              >
                <CheckIcon width={16} height={16} />
                여행 완료
              </button>
              <button
                type="button"
                onClick={() => patch({ status: "saved" })}
                disabled={busy}
                className="btn btn-secondary"
              >
                확정 취소
              </button>
            </>
          )}
          {plan.status === "completed" && (
            <button
              type="button"
              onClick={() => patch({ status: "upcoming" })}
              disabled={busy}
              className="btn btn-secondary flex-1"
            >
              완료 취소
            </button>
          )}
        </div>
      </section>

      {/* 지도 */}
      {allItems.some((i) => i.lat !== null) && (
        <section className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          <div className="h-[260px] w-full sm:h-[320px]">
            <KakaoMap
              places={allItems.map((i) => ({
                id: i.id,
                type: i.type,
                name: i.name,
                lat: i.lat,
                lng: i.lng,
                note: i.note,
                photoUrl: i.photoUrl,
                kakaoPlaceUrl: i.kakaoPlaceUrl,
                priceLevel: i.priceLevel,
              }))}
              focusedId={focusedId}
              onSelect={setFocusedId}
            />
          </div>
        </section>
      )}

      {/* 일자별 일정 */}
      {plan.days.map((day) => (
        <section key={day.id} className="card">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-on-dark">
              {day.dayNumber}
            </span>
            <h2 className="text-[15px] font-semibold text-ink">
              {day.title ?? `${day.dayNumber}일차`}
            </h2>
          </div>

          {day.memo && (
            <p className="mb-3 rounded-md bg-surface-soft p-3 text-[13px] leading-relaxed text-slate">
              {day.memo}
            </p>
          )}

          {day.items.length === 0 ? (
            <p className="text-[13px] text-stone">아직 등록된 장소가 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {day.items.map((item) => {
                const Icon = TYPE_ICON[item.type] ?? CompassIcon;
                const typeLabel =
                  PLACE_TYPES.find((t) => t.key === item.type)?.label ?? "";
                return (
                  <li
                    key={item.id}
                    onMouseEnter={() => setFocusedId(item.id)}
                    className={`rounded-md border p-3 transition-colors ${
                      focusedId === item.id
                        ? "border-primary bg-primary-soft/40"
                        : "border-hairline-soft bg-surface-soft"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoSrc(item.photoUrl)!}
                          alt=""
                          loading="lazy"
                          className="h-14 w-14 shrink-0 rounded-md bg-surface object-cover"
                        />
                      ) : (
                        <span
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md ${
                            TYPE_TINT[item.type] ?? "bg-surface text-stone"
                          }`}
                        >
                          <Icon width={20} height={20} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5">
                          {item.visitTime && (
                            <span className="text-[12px] font-semibold text-primary-deep">
                              {item.visitTime}
                            </span>
                          )}
                          <span className="text-[14px] font-medium text-ink">
                            {item.name}
                          </span>
                          <span className={`tag ${TYPE_TINT[item.type]}`}>
                            {typeLabel}
                          </span>
                        </p>
                        {item.address && (
                          <p className="mt-0.5 text-[12px] text-stone">
                            {item.address}
                          </p>
                        )}
                        {item.note && (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-slate">
                            {item.note}
                          </p>
                        )}
                      </div>
                      {item.kakaoPlaceUrl && (
                        <a
                          href={item.kakaoPlaceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-slate"
                        >
                          지도
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      {/* 메모 */}
      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">메모</h2>
          {memoSaved === "saving" && (
            <span className="text-[12px] text-stone">저장 중...</span>
          )}
          {memoSaved === "saved" && (
            <span className="text-[12px] text-success">저장됨</span>
          )}
        </div>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={saveMemo}
          rows={4}
          placeholder="준비물, 예약 정보, 하고 싶은 말 등을 적어두세요."
          className="input resize-y py-2.5 text-[14px] leading-relaxed"
        />
      </section>

      {/* 다녀온 뒤 기록 */}
      {plan.status === "completed" && (
        <PlanReview plan={plan} onPatch={patch} busy={busy} />
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="btn btn-ghost w-full text-error"
      >
        <TrashIcon width={16} height={16} />
        이 여행 삭제
      </button>
    </div>
  );
}

/** 완료된 여행에만 뜨는 후기 영역 */
function PlanReview({
  plan,
  onPatch,
  busy,
}: {
  plan: PlanDetailData;
  onPatch: (body: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const [review, setReview] = useState(plan.review ?? "");

  return (
    <section className="card">
      <h2 className="mb-3 text-[15px] font-semibold text-ink">여행은 어땠나요</h2>

      <div className="mb-4">
        <p className="mb-2 text-[13px] font-medium text-charcoal">별점</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = (plan.rating ?? 0) >= n;
            return (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => onPatch({ rating: plan.rating === n ? null : n })}
                aria-label={`${n}점`}
                className="flex h-11 w-11 items-center justify-center"
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill={on ? "var(--color-primary)" : "none"}
                  stroke={on ? "var(--color-primary)" : "var(--color-hairline-strong)"}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                >
                  <path d="m12 4 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 4Z" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-charcoal">한줄 후기</p>
        <input
          type="text"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          onBlur={() => {
            if (review !== (plan.review ?? "")) onPatch({ review });
          }}
          placeholder="다음에 또 가고 싶다 / 숙소가 최고였다 등"
          className="input text-[14px]"
        />
      </div>
    </section>
  );
}
