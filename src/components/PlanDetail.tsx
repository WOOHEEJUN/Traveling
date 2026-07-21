"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KakaoMap from "./KakaoMap";
import PlanDayList, { type PlanDayData } from "./PlanDayList";
import PlaceSearchSheet, { type SearchedPlace } from "./PlaceSearchSheet";
import type { PlanItemData } from "./SortablePlanItem";
import { tripStyleLabel } from "@/lib/types";
import { formatDriveTime, nightsLabel } from "@/lib/distance";
import { PLAN_STATUS_STYLE, planStatusLabel } from "@/lib/plan";
import { CheckIcon, RouteOptimizeIcon, TrashIcon } from "./icons";

export type { PlanItemData };

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
  days: PlanDayData[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PlanDetail({ plan }: { plan: PlanDetailData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<PlanDayData[]>(plan.days);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [memo, setMemo] = useState(plan.memo ?? "");
  const [memoState, setMemoState] = useState<"idle" | "saving" | "saved">("idle");
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  /** 순서가 바뀐 뒤에만 최적화 제안을 띄웁니다 */
  const [suggestOptimize, setSuggestOptimize] = useState(false);
  const [optimizeMsg, setOptimizeMsg] = useState<string | null>(null);

  const style = PLAN_STATUS_STYLE[plan.status] ?? PLAN_STATUS_STYLE.saved;
  const allItems = days.flatMap((d) => d.items);

  async function patchPlan(body: Record<string, unknown>) {
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
    setMemoState("saving");
    const ok = await patchPlan({ memo });
    setMemoState(ok ? "saved" : "idle");
    if (ok) setTimeout(() => setMemoState("idle"), 2000);
  }

  /** 드래그로 순서가 바뀌면 화면을 먼저 갱신하고 서버에 반영 */
  async function handleReorder(dayId: string, items: PlanItemData[]) {
    const next = days.map((d) => (d.id === dayId ? { ...d, items } : d));
    setDays(next);
    setSuggestOptimize(true);
    setOptimizeMsg(null);

    await fetch(`/api/plans/${plan.id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((it, i) => ({ id: it.id, dayId, sortOrder: i })),
      }),
    });
    router.refresh();
  }

  async function handleDeleteItem(itemId: string) {
    setDays((prev) =>
      prev.map((d) => ({ ...d, items: d.items.filter((i) => i.id !== itemId) })),
    );
    await fetch(`/api/plans/${plan.id}/items/${itemId}`, { method: "DELETE" });
    setSuggestOptimize(true);
    router.refresh();
  }

  async function handleUpdateItem(
    itemId: string,
    patch: { visitTime?: string; note?: string },
  ) {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        items: d.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
      })),
    );
    await fetch(`/api/plans/${plan.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function handleAddPlace(place: SearchedPlace, type: string) {
    if (!addingToDay) return;
    const res = await fetch(`/api/plans/${plan.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayId: addingToDay,
        type,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        kakaoPlaceUrl: place.placeUrl,
        photoUrl: place.photoUrl,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setDays((prev) =>
        prev.map((d) =>
          d.id === addingToDay
            ? {
                ...d,
                items: [
                  ...d.items,
                  {
                    id: data.itemId,
                    sortOrder: d.items.length,
                    type,
                    name: place.name,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng,
                    kakaoPlaceUrl: place.placeUrl,
                    photoUrl: place.photoUrl,
                    note: null,
                    priceLevel: null,
                    visitTime: null,
                  },
                ],
              }
            : d,
        ),
      );
      setSuggestOptimize(true);
      setOptimizeMsg(null);
      router.refresh();
    }
  }

  async function handleOptimize() {
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestOptimize(false);
        setOptimizeMsg(
          data.savedMinutes > 0
            ? `이동시간을 ${formatDriveTime(data.savedMinutes)} 줄였어요.`
            : data.reordered
              ? "끼니 시간에 맞춰 순서를 정리했어요."
              : "지금 순서가 이미 괜찮아요. 방문 시간만 다시 계산했어요.",
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
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

        <div className="mt-4 flex flex-wrap gap-2">
          {plan.status === "saved" && (
            <button
              type="button"
              onClick={() => patchPlan({ status: "upcoming" })}
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
                onClick={() => patchPlan({ status: "completed" })}
                disabled={busy}
                className="btn btn-primary flex-1"
              >
                <CheckIcon width={16} height={16} />
                여행 완료
              </button>
              <button
                type="button"
                onClick={() => patchPlan({ status: "saved" })}
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
              onClick={() => patchPlan({ status: "upcoming" })}
              disabled={busy}
              className="btn btn-secondary flex-1"
            >
              완료 취소
            </button>
          )}
        </div>
      </section>

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

      {/* 일정 편집 전환 */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold text-ink">일정</h2>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={`rounded-md px-3 py-2 text-[13px] font-medium ${
            editing ? "bg-ink text-on-dark" : "border border-hairline text-slate"
          }`}
        >
          {editing ? "편집 끝내기" : "일정 편집"}
        </button>
      </div>

      {editing && (
        <p className="px-1 text-[12px] leading-relaxed text-stone">
          카드를 꾹 눌러서 순서를 바꾸고, 시간과 메모를 입력할 수 있어요. 바뀐
          내용은 바로 저장됩니다.
        </p>
      )}

      {/* 동선 최적화 제안 — 사용자가 누를 때만 계산 */}
      {suggestOptimize && (
        <div className="rounded-lg border border-plan-upcoming bg-plan-upcoming-soft p-4">
          <p className="text-[13px] font-medium text-ink">
            일정이 바뀌었어요. 이동 동선을 다시 정리할까요?
          </p>
          <p className="mt-1 text-[12px] text-slate">
            가까운 곳끼리 묶고 끼니를 식사시간에 맞춰 순서를 다시 잡습니다.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={busy}
              className="btn btn-primary flex-1"
            >
              <RouteOptimizeIcon width={16} height={16} />
              최적화하기
            </button>
            <button
              type="button"
              onClick={() => setSuggestOptimize(false)}
              className="btn btn-secondary flex-1"
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {optimizeMsg && (
        <p className="rounded-md bg-surface px-4 py-3 text-[13px] text-slate">
          {optimizeMsg}
        </p>
      )}

      <PlanDayList
        days={days}
        regionName={plan.regionName}
        editing={editing}
        focusedId={focusedId}
        onFocus={setFocusedId}
        onReorder={handleReorder}
        onDelete={handleDeleteItem}
        onUpdateItem={handleUpdateItem}
        onAddPlace={setAddingToDay}
        onUpdateDayMemo={async (dayId, dayMemo) => {
          setDays((prev) =>
            prev.map((d) => (d.id === dayId ? { ...d, memo: dayMemo } : d)),
          );
          await fetch(`/api/plans/${plan.id}/days/${dayId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memo: dayMemo }),
          });
          router.refresh();
        }}
      />

      {!editing && (
        <button
          type="button"
          onClick={handleOptimize}
          disabled={busy || allItems.length < 2}
          className="btn btn-secondary w-full"
        >
          <RouteOptimizeIcon width={16} height={16} />
          이동 동선 정리하기
        </button>
      )}

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">메모</h2>
          {memoState === "saving" && (
            <span className="text-[12px] text-stone">저장 중...</span>
          )}
          {memoState === "saved" && (
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

      {plan.status === "completed" && (
        <PlanReview plan={plan} onPatch={patchPlan} busy={busy} />
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

      {addingToDay && (
        <PlaceSearchSheet
          onClose={() => setAddingToDay(null)}
          onAdd={handleAddPlace}
        />
      )}
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
                  stroke={
                    on ? "var(--color-primary)" : "var(--color-hairline-strong)"
                  }
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
