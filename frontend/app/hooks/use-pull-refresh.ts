"use client";

import { useCallback, useRef, useState } from "react";
import { tapLight } from "../lib/haptics";

interface UsePullRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

export function usePullRefresh({ onRefresh, threshold = 80 }: UsePullRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    // Only allow pull when scrolled to top
    if (el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        // Dampen the pull (feels more physical)
        setPullDistance(Math.min(diff * 0.4, 120));
      }
    },
    []
  );

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold) {
      tapLight();
      setIsRefreshing(true);
      setPullDistance(40); // Hold at indicator position
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
