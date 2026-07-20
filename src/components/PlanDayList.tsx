"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import SortablePlanItem, { type PlanItemData } from "./SortablePlanItem";
import { PlusIcon } from "./icons";

export interface PlanDayData {
  id: string;
  dayNumber: number;
  title: string | null;
  memo: string | null;
  items: PlanItemData[];
}

interface Props {
  days: PlanDayData[];
  editing: boolean;
  focusedId: string | null;
  onFocus: (id: string) => void;
  onReorder: (dayId: string, items: PlanItemData[]) => void;
  onDelete: (id: string) => void;
  onUpdateItem: (
    id: string,
    patch: { visitTime?: string; note?: string },
  ) => void;
  onAddPlace: (dayId: string) => void;
  onUpdateDayMemo: (dayId: string, memo: string) => void;
}

export default function PlanDayList({
  days,
  editing,
  focusedId,
  onFocus,
  onReorder,
  onDelete,
  onUpdateItem,
  onAddPlace,
  onUpdateDayMemo,
}: Props) {
  const [dragging, setDragging] = useState<PlanItemData | null>(null);

  /**
   * 폰에서는 "꾹 눌러야" 드래그가 시작되도록 250ms 지연을 둡니다.
   * 지연이 없으면 목록을 스크롤하려다 항목이 끌려갑니다.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
  );

  function handleDragStart(e: DragStartEvent) {
    const all = days.flatMap((d) => d.items);
    setDragging(all.find((i) => i.id === e.active.id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragging(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const day = days.find((d) => d.items.some((i) => i.id === active.id));
    if (!day) return;

    const oldIndex = day.items.findIndex((i) => i.id === active.id);
    const newIndex = day.items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(day.id, arrayMove(day.items, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="space-y-4">
        {days.map((day) => (
          <section key={day.id} className="card">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-on-dark">
                {day.dayNumber}
              </span>
              <h2 className="text-[15px] font-semibold text-ink">
                {day.title ?? `${day.dayNumber}일차`}
              </h2>
            </div>

            {editing ? (
              <textarea
                defaultValue={day.memo ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (day.memo ?? "")) {
                    onUpdateDayMemo(day.id, e.target.value);
                  }
                }}
                rows={3}
                placeholder="이 날의 계획을 적어두세요."
                className="input mb-3 resize-y py-2.5 text-[13px] leading-relaxed"
              />
            ) : (
              day.memo && (
                <p className="mb-3 rounded-md bg-surface-soft p-3 text-[13px] leading-relaxed text-slate">
                  {day.memo}
                </p>
              )
            )}

            {day.items.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-stone">
                아직 등록된 장소가 없어요.
              </p>
            ) : (
              <SortableContext
                items={day.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {day.items.map((item) => (
                    <SortablePlanItem
                      key={item.id}
                      item={item}
                      editing={editing}
                      focused={focusedId === item.id}
                      onFocus={onFocus}
                      onDelete={onDelete}
                      onUpdate={onUpdateItem}
                    />
                  ))}
                </ul>
              </SortableContext>
            )}

            {editing && (
              <button
                type="button"
                onClick={() => onAddPlace(day.id)}
                className="btn btn-secondary mt-3 w-full border-dashed"
              >
                <PlusIcon width={16} height={16} />
                장소 추가
              </button>
            )}
          </section>
        ))}
      </div>

      {/* 드래그 중인 카드를 손가락 아래에 띄움 */}
      <DragOverlay>
        {dragging && (
          <div className="rounded-md border border-primary bg-canvas p-3 shadow-[0_8px_24px_-6px_rgba(15,15,15,0.3)]">
            <p className="text-[14px] font-medium text-ink">{dragging.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
