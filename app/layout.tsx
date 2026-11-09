import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./app.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND} — Pusat Tugas`,
  description: "Platform tugas dengan imbalan, panel admin, dan penarikan saldo."
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
