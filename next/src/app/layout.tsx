import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "./globals.css";
export const metadata: Metadata = {
  title: "VideoGPT Studio — Give ideas motion",
  description: "Create, animate, and refine short visual stories. A focused workspace for ideas worth explaining.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
