"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { rupiah } from "@/lib/format";
import { Download, History, Send, Wallet, ScrollText, Gift, CheckCircle2, Clock, XCircle, ListChecks, ChevronRight, Scale } from "lucide-react";

export default function Dashboard() {
  const { profile, loading, reload } = useProfile();
  const [stat, setStat] = useState({ approved: 0, pending: 0, rejected: 0, open: 0 });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: subs }, { data: tk }] = await Promise.all([
        supabase.from("submissions").select("status").eq("user_id", profile.id),
        supabase.from("tasks").select("claimed_by,submitted_at,due_at").eq("status", "active")
      ]);
      const c = (s: string) => (subs || []).filter(x => x.status === s).length;
      const nowMs = Date.now();
      const open = (tk || []).filter(t => !t.claimed_by || (!t.submitted_at && t.due_at && new Date(t.due_at).getTime() <= nowMs)).length;
      setStat({ approved: c("approved"), pending: c("pending"), rejected: c("rejected"), open });
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    let r: string | null = null;
    try { r = localStorage.getItem("th_ref"); } catch { /* abaikan */ }
    if (!r) return;
    (async () => {
      if (!profile.referred_by) await supabase.rpc("apply_referral", { p_code: r });
      try { localStorage.removeItem("th_ref"); } catch { /* abaikan */ }
      reload();
    })();
  }, [profile, reload]);

  if (loading || !profile) return <Loading />;

  const quick = [
    { href: "/tugas", label: "Tugas", icon: <Send size={26} />, cls: "c-blue" },
    { href: "/riwayat", label: "Riwayat", icon: <History size={26} />, cls: "c-green" },
    { href: "/saldo", label: "Saldo", icon: <Wallet size={26} />, cls: "c-orange" },
    { href: "/aturan", label: "Rules", icon: <ScrollText size={26} />, cls: "c-purple" },
    { href: "/referral", label: "Referral", icon: <Gift size={26} />, cls: "c-teal" }
  ];

  return (
    <Shell profile={profile} active="home">
      <section className="m-hero">
        <div className="m-hero-label"><Wallet size={15} /> SALDO ANDA</div>
        <div className="m-hero-amount">{rupiah(profile.balance)}</div>
        <div className="m-hero-sub">Halo, <b>{profile.full_name || "Pengguna"}</b></div>
        <div className="m-hero-actions">
          <Link href="/saldo" className="m-chip"><Download size={17} /> Tarik Saldo</Link>
          <Link href="/saldo" className="m-chip"><History size={17} /> Riwayat</Link>
        </div>
      </section>

      <section className="m-card m-quick">
        {quick.map(q => (
          <Link key={q.label} href={q.href} className="m-quick-item">
            <span className={`m-quick-ic ${q.cls}`}>{q.icon}</span>{q.label}
          </Link>
        ))}
      </section>

      <Link href="/aturan" className="m-card m-row-link">
        <span className="m-round"><Scale size={22} /></span>
        <span className="grow"><b>Syarat &amp; Ketentuan</b><small>Baca ketentuan penggunaan platform</small></span>
        <ChevronRight size={18} />
      </Link>

      <section className="m-stats">
        <div className="m-stat"><span className="m-stat-ic ok"><CheckCircle2 size={22} /></span><div><small>DITERIMA</small><b>{stat.approved}</b></div></div>
        <div className="m-stat"><span className="m-stat-ic wait"><Clock size={22} /></span><div><small>PENDING</small><b>{stat.pending}</b></div></div>
        <div className="m-stat"><span className="m-stat-ic bad"><XCircle size={22} /></span><div><small>DITOLAK</small><b>{stat.rejected}</b></div></div>
        <div className="m-stat"><span className="m-stat-ic info"><ListChecks size={22} /></span><div><small>TUGAS TERSEDIA</small><b>{stat.open}</b></div></div>
      </section>

      <Link href="/tugas" className="m-card m-limit">
        <b>Tugas yang bisa diambil</b>
        <span><b>{stat.open}</b> tersedia</span>
      </Link>
    </Shell>
  );
}
