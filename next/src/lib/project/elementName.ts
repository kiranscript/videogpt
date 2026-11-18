import type { TimelineEvent } from "@/lib/rendering";
export function elementName(event: TimelineEvent): string {
  if (event.name?.trim()) return event.name;
  if ("text" in event) return event.text || "Empty text";
  if (event.type === "background") return "Scene background";
  if (event.type === "particle") return "Particle field";
  if (event.shapeType === "icon")
    return `${event.iconName[0].toUpperCase()}${event.iconName.slice(1)} icon`;
  const readable = event.id
    .replace(/^(?:scene[-\d]*|main|intro|overview|summary|conclusion)-/i, "")
    .replace(/[-_]\d+$/, "")
    .replace(/[-_]/g, " ");
  const title =
    readable && readable !== event.id && !/^\d+$/.test(readable)
      ? readable
      : event.shapeType;
  return title.charAt(0).toUpperCase() + title.slice(1);
}
