import type { TimelineEvent } from "@/lib/rendering";
/** Front-to-back paint order, including the renderer's stable ordering for ties. */
export function frontToBack(events: TimelineEvent[]): TimelineEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => b.event.layer - a.event.layer || b.index - a.index)
    .map(({ event }) => event);
}
