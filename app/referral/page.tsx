"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { dateTime, rupiah } from "@/lib/format";
import { Gift, Copy, Share2, Users, Check } from "lucide-react";

type R = { full_name: string | null; joined_at: string; bonus_paid: boolean };

export default function Referral() {
  const { profile, loading } = useProfile();
  const [list, setList] = useState<R[]>([]);
  const [bonus, setBonus] = useState(0);
  const [earned, setEarned] = useState(0);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: l }, { data: b }, { data: tx }] = await Promise.all([
        supabase.rpc("my_referrals"),
        supabase.from("app_settings").select("value").eq("key", "referral_bonus").maybeSingle(),
        supabase.from("wallet_transactions").select("amount").eq("user_id", profile.id).eq("description", "Bonus referral")
      ]);
      setList((l || []) as R[]);
      setBonus(Number(b?.value || 0));
      setEarned((tx || []).reduce((a, x) => a + Number(x.amount), 0));
    })();
  }, [profile]);

  if (loading || !profile) return <Loading />;

  const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
  const text = `Yuk gabung di TUGAS HUB, kerjakan tugas dan dapat saldo! Daftar lewat link ini: ${link}`;

  async function copy(what: string, value: string) {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const ta = document.createElement("textarea"); ta.value = value; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(what); setTimeout(() => setCopied(""), 1800);
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* batal */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <Shell profile={profile} active="none">
      <section className="m-banner teal">
        <h1><Gift size={28} /> Referral</h1>
        <p>Ajak teman. Kamu dapat <b>{rupiah(bonus)}</b> saat tugas pertama temanmu disetujui admin.</p>
      </section>

      <section className="m-card">
        <small className="m-lbl">KODE REFERRAL KAMU</small>
        <div className="m-ref-code">{profile.referral_code}</div>
        <div className="m-copy-row">
          <button className="m-btn sm" onClick={() => copy("code", profile.referral_code || "")}>{copied === "code" ? <><Check size={16} /> Tersalin</> : <><Copy size={16} /> Salin kode</>}</button>
        </div>

        <small className="m-lbl">LINK REFERRAL</small>
        <div className="m-ref-link">{link}</div>
        <div className="m-copy-row">
          <button className="m-btn sm" onClick={() => copy("link", link)}>{copied === "link" ? <><Check size={16} /> Tersalin</> : <><Copy size={16} /> Salin link</>}</button>
          <button className="m-btn sm alt" onClick={share}><Share2 size={16} /> Bagikan</button>
        </div>
      </section>

      <section className="m-stats">
        <div className="m-stat"><span className="m-stat-ic info"><Users size={22} /></span><div><small>DIUNDANG</small><b>{list.length}</b></div></div>
        <div className="m-stat"><span className="m-stat-ic ok"><Gift size={22} /></span><div><small>TOTAL BONUS</small><b className="sm-num">{rupiah(earned)}</b></div></div>
      </section>

      <section className="m-card">
        <h2 className="m-h2">Teman yang kamu ajak</h2>
        {list.length === 0 && <p className="center muted">Belum ada. Bagikan linkmu untuk mulai.</p>}
        {list.map((r, i) => (
          <div key={i} className="history-row">
            <div><b>{r.full_name || "Pengguna"}</b><small>Bergabung {dateTime(r.joined_at)}</small></div>
            <span className={`status ${r.bonus_paid ? "approved" : "pending"}`}>{r.bonus_paid ? "Bonus cair" : "Menunggu tugas"}</span>
          </div>
        ))}
      </section>
    </Shell>
  );
}
