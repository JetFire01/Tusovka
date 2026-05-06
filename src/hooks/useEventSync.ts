"use client";

import { useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL_MS = 5000;
const BACKOFF_STEPS_MS = [3000, 6000, 12000];

type Options = {
  onChange: () => void;
  pause?: () => boolean;
};

export function useEventSync(eventId: string | null | undefined, opts: Options) {
  const { onChange, pause } = opts;
  const lastSeenRef = useRef<string | null>(null);
  const errorStreakRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const pauseRef = useRef(pause);

  useEffect(() => {
    onChangeRef.current = onChange;
    pauseRef.current = pause;
  }, [onChange, pause]);

  const tick = useCallback(async () => {
    if (!eventId) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (pauseRef.current?.()) return;

    try {
      const res = await fetch(`/api/events/${eventId}/sync`);
      if (!res.ok) {
        errorStreakRef.current = Math.min(errorStreakRef.current + 1, BACKOFF_STEPS_MS.length);
        return;
      }
      errorStreakRef.current = 0;
      const data: { updatedAt: string } = await res.json();
      if (lastSeenRef.current === null) {
        lastSeenRef.current = data.updatedAt;
        return;
      }
      if (data.updatedAt !== lastSeenRef.current) {
        lastSeenRef.current = data.updatedAt;
        onChangeRef.current();
      }
    } catch {
      errorStreakRef.current = Math.min(errorStreakRef.current + 1, BACKOFF_STEPS_MS.length);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled) return;
      const delay =
        errorStreakRef.current > 0
          ? BACKOFF_STEPS_MS[errorStreakRef.current - 1]
          : POLL_INTERVAL_MS;
      timer = setTimeout(async () => {
        await tick();
        schedule();
      }, delay);
    };

    schedule();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        tick().then(schedule);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [eventId, tick]);

  const markFresh = useCallback((updatedAt?: string) => {
    if (updatedAt) lastSeenRef.current = updatedAt;
  }, []);

  return { markFresh };
}
