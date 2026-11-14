"use client";

import Link from "next/link";
import { Mail, Home, History, Send, Wallet, User, ShieldCheck } from "lucide-react";
import { BRAND_A, BRAND_B } from "@/lib/brand";
import { isVip } from "@/lib/vip";
import type { Profile } from "@/lib/useProfile";

export type NavKey = "home" | "riwayat" | "tugas" | "saldo" | "profil" | "none";

export function Loading() {
  return <div className="loading">Memuat...</div>;
}

export default function Shell({
  profile, active, children
}: { profile: Profile; active: NavKey; children: React.ReactNode }) {
  const item = (key: NavKey, href: string, label: string, icon: React.ReactNode) => (
    <Link href={href} className={`m-nav-item ${active === key ? "on" : ""}`}>
      <span className="m-nav-ic">{icon}</span>{label}
    </Link>
  );
  return (
    <div className="m-app">
      <header className="m-top">
        <Link href="/dashboard" className="brand">
          <span className="brand-icon sm"><Mail size={20} /></span>
          <span>{BRAND_A} <b>{BRAND_B}</b></span>
        </Link>
        {isVip(profile) && <Link href="/vip" className="m-vip-badge">👑 VIP</Link>}
        {profile.role === "admin" && (
          <Link href="/admin" className="m-pill"><ShieldCheck size={16} /> Admin</Link>
        )}
      </header>
      <main className="m-main">{children}</main>
      <nav className="m-nav">
        {item("home", "/dashboard", "Beranda", <Home size={22} />)}
        {item("riwayat", "/riwayat", "Riwayat", <History size={22} />)}
        <Link href="/tugas" className={`m-fab-wrap ${active === "tugas" ? "on" : ""}`}>
          <span className="m-fab"><Send size={26} /></span>
          <span className="m-fab-label">Tugas</span>
        </Link>
        {item("saldo", "/saldo", "Saldo", <Wallet size={22} />)}
        {item("profil", "/profil", "Profil", <User size={22} />)}
      </nav>
    </div>
  );
}
