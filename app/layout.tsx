import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S3L ZERO99 — Pusat Tugas",
  description: "Platform pengelolaan tugas dan pengajuan pekerjaan."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
