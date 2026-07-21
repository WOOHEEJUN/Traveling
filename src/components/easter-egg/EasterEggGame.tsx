"use client";

import { useEffect, useState } from "react";
import MazeStage from "./MazeStage";
import SlidePuzzleStage from "./SlidePuzzleStage";
import MemoryStage from "./MemoryStage";
import { CheckIcon, SparkIcon } from "../icons";

const CLEARED_KEY = "traveling_egg_cleared";

type StageDef =
  | { kind: "maze"; size: number }
  | { kind: "slide"; n: number }
  | { kind: "memory"; pairCount: number };

const STAGES: StageDef[] = [
  { kind: "maze", size: 6 },
  { kind: "maze", size: 9 },
  { kind: "slide", n: 3 },
  { kind: "slide", n: 4 },
  { kind: "memory", pairCount: 8 },
  { kind: "memory", pairCount: 12 },
];

export default function EasterEggGame({ onClose }: { onClose: () => void }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [cleared, setCleared] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(CLEARED_KEY) === "1",
  );

  // 열려있는 동안 배경 스크롤 잠금
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  function handleStageClear() {
    if (stageIndex + 1 >= STAGES.length) {
      localStorage.setItem(CLEARED_KEY, "1");
      setCleared(true);
    } else {
      setStageIndex((i) => i + 1);
    }
  }

  const stage = STAGES[stageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="relative w-full max-w-sm rounded-lg bg-canvas p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-stone"
        >
          ×
        </button>

        {cleared ? (
          <RewardScreen onClose={onClose} />
        ) : (
          <>
            <div className="mb-4 text-center">
              <p className="text-[12px] font-medium text-primary-deep">
                깜짝 미니게임
              </p>
              <h2 className="mt-0.5 text-[17px] font-semibold text-ink">
                {stageIndex + 1} / {STAGES.length} 단계
              </h2>
              <div className="mt-2 flex justify-center gap-1.5">
                {STAGES.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i < stageIndex
                        ? "bg-primary"
                        : i === stageIndex
                          ? "bg-primary-deep"
                          : "bg-hairline-strong"
                    }`}
                  />
                ))}
              </div>
            </div>

            {stage.kind === "maze" && (
              <MazeStage
                key={stageIndex}
                size={stage.size}
                onClear={handleStageClear}
              />
            )}
            {stage.kind === "slide" && (
              <SlidePuzzleStage
                key={stageIndex}
                n={stage.n}
                onClear={handleStageClear}
              />
            )}
            {stage.kind === "memory" && (
              <MemoryStage
                key={stageIndex}
                pairCount={stage.pairCount}
                onClear={handleStageClear}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RewardScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-deep">
        <SparkIcon width={28} height={28} />
      </span>
      <h2 className="mt-4 text-[17px] font-semibold text-ink">
        6단계 클리어!
      </h2>
      <p className="mt-1 text-[13px] text-steel">숨겨진 상품을 찾았어요</p>

      <div className="mt-5 w-full rounded-lg border border-dashed border-primary bg-primary-soft/50 p-5">
        <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-primary-deep">
          <CheckIcon width={14} height={14} />
          이용권
        </p>
        <p className="mt-2 text-[16px] font-semibold leading-relaxed text-ink">
          우희준 언제 어디서나 배달 이용권!
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="btn btn-primary mt-5 w-full"
      >
        닫기
      </button>
    </div>
  );
}
