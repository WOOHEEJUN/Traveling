"use client";

import { useEffect, useMemo, useState } from "react";
import { canMove, generateMaze } from "./maze";
import { PinIcon, StarIcon } from "../icons";

const CELL_PX = 24;

const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

export default function MazeStage({
  size,
  onClear,
}: {
  size: number;
  onClear: () => void;
}) {
  const walls = useMemo(() => generateMaze(size), [size]);
  const [pos, setPos] = useState<[number, number]>([0, 0]);

  function move(dr: number, dc: number) {
    setPos(([r, c]) => {
      if (!canMove(walls, r, c, dr, dc)) return [r, c];
      const next: [number, number] = [r + dr, c + dc];
      if (next[0] === size - 1 && next[1] === size - 1) {
        setTimeout(onClear, 300);
      }
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = KEY_DIRS[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir[0], dir[1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walls]);

  const dim = size * 2 + 1;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-[13px] text-steel">방향키나 아래 버튼으로 이동해서 별까지 가세요</p>
      <div
        className="grid gap-0 rounded-md border border-hairline-strong bg-ink p-1"
        style={{
          gridTemplateColumns: `repeat(${dim}, ${CELL_PX}px)`,
          gridTemplateRows: `repeat(${dim}, ${CELL_PX}px)`,
        }}
      >
        {walls.map((row, rr) =>
          row.map((isWall, cc) => {
            const isPlayer =
              rr === pos[0] * 2 + 1 && cc === pos[1] * 2 + 1;
            const isGoal =
              rr === (size - 1) * 2 + 1 && cc === (size - 1) * 2 + 1;
            return (
              <div
                key={`${rr}-${cc}`}
                className={`flex items-center justify-center ${
                  isWall ? "bg-ink" : "bg-canvas"
                }`}
                style={{ width: CELL_PX, height: CELL_PX }}
              >
                {isPlayer && (
                  <PinIcon width={14} height={14} className="text-primary" />
                )}
                {!isPlayer && isGoal && (
                  <StarIcon
                    width={14}
                    height={14}
                    className="text-plan-upcoming"
                  />
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* 모바일용 방향 버튼 */}
      <div className="grid grid-cols-3 gap-1.5">
        <span />
        <DirButton label="↑" onClick={() => move(-1, 0)} />
        <span />
        <DirButton label="←" onClick={() => move(0, -1)} />
        <DirButton label="↓" onClick={() => move(1, 0)} />
        <DirButton label="→" onClick={() => move(0, 1)} />
      </div>
    </div>
  );
}

function DirButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-md border border-hairline bg-canvas text-[16px] font-medium text-slate active:bg-surface"
    >
      {label}
    </button>
  );
}
