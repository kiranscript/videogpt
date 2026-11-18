"use client";
import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
export function useViewportHeight() {
  return useSyncExternalStore(
    subscribe,
    () => window.innerHeight,
    () => 800,
  );
}
