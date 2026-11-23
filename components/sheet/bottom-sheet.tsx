"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

export type BottomSheetSnap = "peek" | "half" | "full";

const SNAPS: BottomSheetSnap[] = ["peek", "half", "full"];
const HEIGHTS: Record<BottomSheetSnap, string> = {
  peek: "7rem",
  half: "min(50dvh, 32rem)",
  full: "min(88dvh, 56rem)",
};

interface BottomSheetProps {
  children: ReactNode;
  title: string;
  defaultSnap?: BottomSheetSnap;
  snap?: BottomSheetSnap;
  onSnapChange?: (snap: BottomSheetSnap) => void;
  testId?: string;
}

export function BottomSheet({
  children,
  title,
  defaultSnap = "peek",
  snap: controlledSnap,
  onSnapChange,
  testId = "bottom-sheet",
}: BottomSheetProps) {
  const [internalSnap, setInternalSnap] = useState(defaultSnap);
  const snap = controlledSnap !== undefined ? controlledSnap : internalSnap;

  function updateSnap(newSnap: BottomSheetSnap | ((prev: BottomSheetSnap) => BottomSheetSnap)) {
    const resolved = typeof newSnap === "function" ? newSnap(snap) : newSnap;
    if (controlledSnap === undefined) {
      setInternalSnap(resolved);
    }
    if (onSnapChange) {
      onSnapChange(resolved);
    }
  }

  const touchStartY = useRef<number | null>(null);
  const suppressClick = useRef(false);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    suppressClick.current = false;
    touchStartY.current = event.clientY;
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - event.clientY;
    touchStartY.current = null;
    if (Math.abs(delta) < 48) return;
    suppressClick.current = true;

    updateSnap((current) => {
      const index = SNAPS.indexOf(current);
      return SNAPS[Math.max(0, Math.min(SNAPS.length - 1, index + Math.sign(delta)))];
    });
  }

  return (
    <section
      data-testid={testId}
      data-snap={snap}
      aria-label={title}
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl border-t border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur transition-[height] duration-200 ease-out sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(24rem,calc(100vw_-_2rem))] sm:rounded-2xl sm:border"
      style={{ height: HEIGHTS[snap], paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="shrink-0 border-b border-slate-800/80 px-3 pb-2">
        <button
          type="button"
          data-testid="bottom-sheet-handle"
          aria-label={`Resize ${title} sheet`}
          className="flex h-11 w-full touch-none items-center justify-center"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => (touchStartY.current = null)}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            updateSnap((current) => SNAPS[(SNAPS.indexOf(current) + 1) % SNAPS.length]);
          }}
        >
          <span aria-hidden="true" className="h-1 w-12 rounded-full bg-slate-600" />
        </button>
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <div aria-label="Sheet size" className="flex shrink-0 gap-1">
            {SNAPS.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={snap === size}
                aria-label={`${size[0].toUpperCase()}${size.slice(1)} sheet`}
                data-testid={`bottom-sheet-${size}`}
                onClick={() => updateSnap(size)}
                className="min-h-11 rounded-md px-2 text-[11px] capitalize text-slate-300 hover:bg-slate-800 aria-pressed:bg-emerald-500/15 aria-pressed:text-emerald-200"
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        data-testid="bottom-sheet-content"
        hidden={snap === "peek"}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
      >
        {children}
      </div>
    </section>
  );
}
