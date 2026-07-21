"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PLACE_TYPES } from "@/lib/types";
import { placeMapLink } from "@/lib/maps";
import { photoSrc } from "@/lib/photo";
import {
  BedIcon,
  CakeIcon,
  CompassIcon,
  ForkKnifeIcon,
  TrashIcon,
} from "./icons";

export interface PlanItemData {
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

interface Props {
  item: PlanItemData;
  /** 구글맵 검색어에 지역명을 붙이기 위함 (해외 등 카카오 링크가 없을 때) */
  regionName: string;
  editing: boolean;
  onFocus: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { visitTime?: string; note?: string }) => void;
  focused: boolean;
}

export default function SortablePlanItem({
  item,
  regionName,
  editing,
  onFocus,
  onDelete,
  onUpdate,
  focused,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !editing });

  const [time, setTime] = useState(item.visitTime ?? "");
  const [note, setNote] = useState(item.note ?? "");

  const Icon = TYPE_ICON[item.type] ?? CompassIcon;
  const typeLabel = PLACE_TYPES.find((t) => t.key === item.type)?.label ?? "";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => onFocus(item.id)}
      className={`rounded-md border transition-colors ${
        isDragging
          ? "z-10 border-primary bg-canvas opacity-90 shadow-[0_8px_24px_-6px_rgba(15,15,15,0.25)]"
          : focused
            ? "border-primary bg-primary-soft/40"
            : "border-hairline-soft bg-surface-soft"
      }`}
    >
      <div
        className="flex items-start gap-3 p-3"
        // 편집 모드에서 카드를 꾹 누르면 드래그 시작
        {...(editing ? { ...attributes, ...listeners } : {})}
        style={editing ? { touchAction: "none", cursor: "grab" } : undefined}
      >
        {editing && (
          <span className="mt-1 shrink-0 text-hairline-strong">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />
            </svg>
          </span>
        )}

        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc(item.photoUrl)!}
            alt=""
            loading="lazy"
            draggable={false}
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
            {item.visitTime && !editing && (
              <span className="text-[12px] font-semibold text-primary-deep">
                {item.visitTime}
              </span>
            )}
            <span className="text-[14px] font-medium text-ink">{item.name}</span>
            <span className={`tag ${TYPE_TINT[item.type]}`}>{typeLabel}</span>
          </p>
          {item.address && (
            <p className="mt-0.5 text-[12px] text-stone">{item.address}</p>
          )}
          {item.note && !editing && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate">
              {item.note}
            </p>
          )}
        </div>

        {!editing &&
          (() => {
            const link = placeMapLink(
              item.kakaoPlaceUrl,
              `${regionName} ${item.name}`,
            );
            return (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-slate"
              >
                {link.label}
              </a>
            );
          })()}
      </div>

      {/* 편집 모드에서만 시간·메모 입력 */}
      {editing && (
        <div className="border-t border-hairline-soft px-3 py-2.5">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-charcoal">
              시간
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onBlur={() => {
                if (time !== (item.visitTime ?? "")) {
                  onUpdate(item.id, { visitTime: time });
                }
              }}
              className="rounded-md border border-hairline-strong bg-canvas px-2 py-1.5 text-[13px] text-ink"
            />
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label="삭제"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-error"
            >
              <TrashIcon width={16} height={16} />
            </button>
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note !== (item.note ?? "")) onUpdate(item.id, { note });
            }}
            placeholder="메모 (예: 예약 필요, 주차 어려움)"
            className="mt-2 w-full rounded-md border border-hairline-strong bg-canvas px-2.5 py-2 text-[13px] text-ink"
          />
        </div>
      )}
    </li>
  );
}
