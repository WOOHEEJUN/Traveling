"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLAN_STATUS_STYLE, planStatusLabel } from "@/lib/plan";
import { nightsLabel } from "@/lib/distance";
import { ChevronRightIcon } from "./icons";

export interface CalendarPlan {
  id: string;
  title: string;
  regionName: string;
  startDate: string;
  endDate: string;
  status: string;
  nights: number;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(iso: string) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function TripCalendar({ plans }: { plans: CalendarPlan[] }) {
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  /** 날짜 → 그날 걸쳐 있는 여행들 (여행은 여러 날에 걸침) */
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPlan[]>();
    for (const plan of plans) {
      const cursor = startOfDay(plan.startDate);
      const end = startOfDay(plan.endDate);
      while (cursor <= end) {
        const key = dayKey(cursor);
        map.set(key, [...(map.get(key) ?? []), plan]);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [plans]);

  const cells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    const out: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) out.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      out.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return out;
  }, [viewMonth]);

  /** 이번 달에 걸쳐 있는 여행 목록 (달력 아래 요약) */
  const monthPlans = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0);
    return plans.filter((p) => {
      const s = startOfDay(p.startDate);
      const e = startOfDay(p.endDate);
      return s <= monthEnd && e >= monthStart;
    });
  }, [plans, viewMonth]);

  function shiftMonth(delta: number) {
    setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="이전 달"
            className="flex h-9 w-9 items-center justify-center rounded-md text-steel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <p className="text-[15px] font-semibold tracking-tight text-ink">
            {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="다음 달"
            className="flex h-9 w-9 items-center justify-center rounded-md text-steel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-1.5 text-center text-[11px] font-medium ${
                i === 0 ? "text-primary" : "text-stone"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px">
          {cells.map((date, i) => {
            if (!date) return <div key={`e-${i}`} className="min-h-[54px]" />;
            const key = dayKey(date);
            const dayPlans = byDay.get(key) ?? [];
            const isToday = date.getTime() === today.getTime();

            return (
              <div
                key={key}
                className="flex min-h-[54px] flex-col items-center gap-1 py-1"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                    isToday
                      ? "bg-ink font-semibold text-on-dark"
                      : date.getDay() === 0
                        ? "text-primary"
                        : "text-charcoal"
                  }`}
                >
                  {date.getDate()}
                </span>
                {/* 여행이 있는 날은 상태 색 점으로 표시 */}
                <span className="flex flex-wrap justify-center gap-0.5">
                  {dayPlans.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      title={p.title}
                      className={`h-1.5 w-1.5 rounded-full ${
                        PLAN_STATUS_STYLE[p.status]?.dot ?? "bg-stone"
                      }`}
                    />
                  ))}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 border-t border-hairline-soft pt-3">
          {(["upcoming", "completed"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${PLAN_STATUS_STYLE[s].dot}`}
              />
              <span className="text-[11px] font-medium text-steel">
                {planStatusLabel(s)}
              </span>
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-[13px] font-semibold text-charcoal">
          {viewMonth.getMonth() + 1}월 여행
        </h2>
        {monthPlans.length === 0 ? (
          <p className="card text-center text-[13px] text-stone">
            이번 달에 잡힌 여행이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {monthPlans.map((p) => {
              const style = PLAN_STATUS_STYLE[p.status] ?? PLAN_STATUS_STYLE.saved;
              const s = new Date(p.startDate);
              const e = new Date(p.endDate);
              return (
                <li key={p.id}>
                  <Link
                    href={`/plans/${p.id}`}
                    className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas p-4"
                  >
                    <span className={`h-9 w-1 shrink-0 rounded-full ${style.dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[15px] font-semibold text-ink">
                          {p.title}
                        </span>
                        <span className={`badge ${style.chip}`}>
                          {planStatusLabel(p.status)}
                        </span>
                      </span>
                      <span className="mt-1 block text-[12px] text-stone">
                        {s.getMonth() + 1}월 {s.getDate()}일 – {e.getMonth() + 1}
                        월 {e.getDate()}일 · {nightsLabel(p.nights)}
                      </span>
                    </span>
                    <ChevronRightIcon
                      width={16}
                      height={16}
                      className="shrink-0 text-hairline-strong"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
