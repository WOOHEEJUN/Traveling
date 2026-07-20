"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface Props {
  /** 선택된 출발일 (YYYY-MM-DD) */
  startDate: string | null;
  /** 선택된 도착일 (YYYY-MM-DD) */
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

/**
 * 범위 선택 달력. 첫 탭은 출발일, 두 번째 탭은 도착일.
 * 이미 범위가 잡힌 상태에서 다시 탭하면 새 범위를 시작합니다.
 */
export default function Calendar({ startDate, endDate, onChange }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const days = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return cells;
  }, [viewMonth]);

  function handlePick(date: Date) {
    const key = toKey(date);
    // 시작 전이거나 이미 범위가 완성된 상태 → 새 범위 시작
    if (!startDate || (startDate && endDate)) {
      onChange(key, null);
      return;
    }
    // 시작일보다 앞을 고르면 그 날짜를 새 시작일로
    if (key < startDate) {
      onChange(key, null);
      return;
    }
    onChange(startDate, key);
  }

  function shiftMonth(delta: number) {
    setViewMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + delta, 1),
    );
  }

  const canGoPrev =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() &&
      viewMonth.getMonth() > today.getMonth());

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoPrev}
          aria-label="이전 달"
          className="flex h-9 w-9 items-center justify-center rounded-md text-steel disabled:text-hairline"
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

      <div className="mb-1 grid grid-cols-7">
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

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const key = toKey(date);
          const isPast = date < today;
          const isStart = key === startDate;
          const isEnd = key === endDate;
          const inRange =
            startDate && endDate && key > startDate && key < endDate;
          const isEdge = isStart || isEnd;

          return (
            <div
              key={key}
              className={`relative flex justify-center ${
                inRange ? "bg-primary-soft" : ""
              } ${isStart && endDate ? "rounded-l-full bg-primary-soft" : ""} ${
                isEnd ? "rounded-r-full bg-primary-soft" : ""
              }`}
            >
              <button
                type="button"
                disabled={isPast}
                onClick={() => handlePick(date)}
                aria-pressed={isEdge}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full text-[14px] transition-colors ${
                  isEdge
                    ? "bg-primary font-semibold text-on-primary"
                    : isPast
                      ? "text-hairline-strong"
                      : inRange
                        ? "text-primary-deep"
                        : "text-charcoal"
                }`}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
