import type { CSSProperties } from "react";
const paths = {
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  collapse: "M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5",
  skipStart: "M5 5v14m14-14L8 12l11 7Z",
  skipEnd: "M19 5v14M5 5l11 7-11 7Z",
  pencil: "m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z",
  play: "m9 5 11 7-11 7Z",
  pause: "M8 5v14M16 5v14",
  plus: "M12 5v14M5 12h14",
  undo: "M9 5 4 10l5 5M4 10h9a6 6 0 0 1 6 6v2",
  redo: "m15 5 5 5-5 5m5-5h-9a6 6 0 0 0-6 6v2",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  sparkle: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
  folder: "M3 6h7l2 3h9v11H3Z",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  close: "m6 6 12 12M6 18 18 6",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6",
  text: "M4 5h16M12 5v15M8 20h8",
  shape: "M5 5h14v14H5Z",
  chevron: "m9 5 7 7-7 7",
  grid: "M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z",
  check: "m5 12 4 4L19 6",
  stop: "M6 6h12v12H6Z",
  layers: "m12 3 10 6-10 6L2 9Zm-9 10 9 6 9-6m-18 5 9 6 9-6",
} as const;
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
