"use client";

import { useEffect, useRef } from "react";

/** Refresh visible database-backed screens periodically so changes made on
 * another device become visible without requiring a manual reload. */
export function useLiveRefresh(refresh: () => void, intervalMs = 10000) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshRef.current();
    }, intervalMs);

    const onFocus = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);
}
