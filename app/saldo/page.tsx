"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { dateTime, rupiah, STATUS_LABEL } from "@/lib/format";
import { MIN_WITHDRAW } from "@/lib/brand";
import { Download, Info } from "lucide-react";

type W = { id: string; method: string; account_number: string; amount: number; status: string; created_at: string };
type T = { id: string; description: string; amount: number; balance_after: number | null; created_at: string };
const METHODS = ["DANA", "OVO", "GoPay"] as const;

export default function Saldo() {
  const { profile, loading, reload } = useProfile();
  const [ws, setWs] = useState<W[]>([]);
  const [ts, setTs] = useState<T[]>([]);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("DANA");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from("withdrawals").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false })
    ]);
    setWs((w || []) as W[]); setTs((t || []) as T[]);
  }, [profile]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (profile?.ewallet_method) setMethod(profile.ewallet_method);
    if (profile?.ewallet_number) setNumber(profile.ewallet_number);
  }, [profile]);

  if (loading || !profile) return <Loading />;

  const short = Math.max(0, MIN_WITHDRAW - profile.balance);

  async function save() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("save_ewallet", { p_method: method, p_number: number.trim() });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Nomor tersimpan." });
    reload();
  }
  async function withdraw() {
    const n = Number(amount);
    if (!n) { setMsg({ ok: false, text: "Isi nominal penarikan." }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("request_withdrawal", { p_amount: n });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else { setMsg({ ok: true, text: "Permintaan penarikan dikirim." }); setAmount(""); }
    reload(); load();
  }

  return (
    <Shell profile={profile} active="saldo">
      <section className="m-card">
        <div className="m-hero in">
          <div className="m-hero-sub big">Saldo saat ini</div>
          <div className="m-hero-amount">{rupiah(profile.balance)}</div>
          <button className="m-btn glass" disabled={busy || profile.balance < MIN_WITHDRAW} onClick={() => document.getElementById("amt")?.focus()}>
            <Download size={18} /> Tarik Saldo
          </button>
          {short > 0 && (
            <div className="m-hero-note"><Info size={15} /> Saldo kamu {rupiah(profile.balance)}, kurang {rupiah(short)} lagi untuk mencapai minimum penarikan {rupiah(MIN_WITHDRAW)}.</div>
          )}
        </div>

        <div className="m-status-ok">Status Penarikan: <span className="dot" /> Dibuka</div>

        {msg && <div className={`notice ${msg.ok ? "success" : ""}`}>{msg.text}</div>}

        <div className="m-box">
          <div className="m-box-head"><b>Nomor {method} Tersimpan</b>
            <span className={`m-badge ${profile.ewallet_number ? "ok" : ""}`}>{profile.ewallet_number ? "Tersimpan" : "Belum diisi"}</span></div>
          <div className="m-seg tight">
            {METHODS.map(m => <button key={m} className={`m-seg-b ${method === m ? "on" : ""}`} onClick={() => setMethod(m)}>{m}</button>)}
          </div>
          <p className="muted sm">Simpan nomor {method} agar tidak perlu mengetik ulang setiap penarikan. Hanya angka, 10–15 digit.</p>
          <input className="plain-input" inputMode="numeric" placeholder="081234567890" value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, ""))} />
          <button className="m-btn" disabled={busy} onClick={save}>Simpan</button>
        </div>

        <div className="m-box">
          <div className="m-box-head"><b>Ajukan Penarikan</b></div>
          <input id="amt" className="plain-input" inputMode="numeric" placeholder={`Nominal (min ${rupiah(MIN_WITHDRAW)})`} value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} />
          <button className="m-btn" disabled={busy || !profile.ewallet_number} onClick={withdraw}>Tarik ke {profile.ewallet_method || "e-wallet"}</button>
        </div>

        <h2 className="m-h2">Riwayat Penarikan</h2>
        <div className="m-list">
          {ws.length === 0 && <p className="center muted">Belum ada penarikan.</p>}
          {ws.map(w => (
            <div key={w.id} className="m-li">
              <div className="m-li-l"><b>{w.method} · {w.account_number}</b><small>{dateTime(w.created_at)}</small></div>
              <div className="m-li-r"><b>{rupiah(w.amount)}</b><span className={`status ${w.status === "paid" ? "approved" : w.status}`}>{STATUS_LABEL[w.status]}</span></div>
            </div>
          ))}
        </div>

        <h2 className="m-h2">Riwayat Transaksi</h2>
        <div className="m-list">
          {ts.length === 0 && <p className="center muted">Belum ada transaksi.</p>}
          {ts.map(t => (
            <div key={t.id} className="m-li">
              <div className="m-li-l"><b>{t.description}</b><small>{dateTime(t.created_at)}</small></div>
              <div className="m-li-r"><b className={t.amount < 0 ? "neg" : "pos"}>{t.amount < 0 ? "-" : "+"}{rupiah(Math.abs(t.amount))}</b>{t.balance_after != null && <small>Saldo {rupiah(t.balance_after)}</small>}</div>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
              }
