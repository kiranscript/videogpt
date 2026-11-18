"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const snapshot = () =>
  /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
export function useShortcutLabel() {
  return useSyncExternalStore(subscribe, snapshot, () => "Ctrl");
}
