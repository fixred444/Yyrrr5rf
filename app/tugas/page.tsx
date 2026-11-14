"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isVip } from "@/lib/vip";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { rupiah } from "@/lib/format";
import { Crown, Search, Send, ChevronRight, Lock, Hourglass, CheckCircle2, Timer, Play, XCircle, Users } from "lucide-react";

type Board = {
  id: string; title: string; reward: number; duration_minutes: number; quota: number; status: string;
  created_at: string; used: number; my_status: string | null; my_due_at: string | null; vip_only: boolean;
};

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), d = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(d)}` : `${p(m)}:${p(d)}`;
};

export default function TugasPage() {
  const { profile, loading } = useProfile();
  const [tasks, setTasks] = useState<Board[]>([]);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pct, setPct] = useState(20);
  const vip = isVip(profile);
  const boost = (n: number) => Math.round(n * (100 + pct) / 100);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "vip_bonus_percent").maybeSingle()
      .then(({ data }) => { if (data?.value) setPct(Number(data.value) || 0); });
  }, []);

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.rpc("task_board");
    setTasks((data || []) as Board[]);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    load();
    const ch = supabase.channel("tasks-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_claims" }, () => load())
      .subscribe();
    const timer = setInterval(load, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(timer); };
  }, [profile, load]);

  // Status saya untuk tiap tugas (working yang sudah lewat waktu dianggap expired)
  const myState = useCallback((t: Board) => {
    const due = t.my_due_at ? new Date(t.my_due_at).getTime() : 0;
    if (t.my_status === "expired" || (t.my_status === "working" && due <= now)) return "expired";
    return t.my_status;
  }, [now]);

  // Tugas yang instruksinya boleh saya buka
  const openIds = useMemo(() =>
    tasks.filter(t => { const s = myState(t); return s === "working" || s === "submitted" || s === "approved"; })
      .map(t => t.id).sort().join(","),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tasks, Math.floor(now / 5000)]);

  useEffect(() => {
    if (!openIds) { setDetails({}); return; }
    supabase.from("task_details").select("task_id,instructions").in("task_id", openIds.split(","))
      .then(({ data }) => setDetails(Object.fromEntries((data || []).map(d => [d.task_id, d.instructions]))));
  }, [openIds]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return tasks.filter(t => !k || t.title.toLowerCase().includes(k));
  }, [tasks, q]);

  async function run(fn: "claim_task" | "submit_task", t: Board, okText: string) {
    setBusy(t.id); setMsg(null);
    const { error } = await supabase.rpc(fn, { p_task_id: t.id });
    setBusy(null);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: okText });
    await load();
  }
  function start(t: Board) {
    if (!window.confirm(`Kerjakan "${t.title}"? Waktumu ${t.duration_minutes} menit. Satu akun hanya bisa mengerjakan tugas ini sekali.`)) return;
    run("claim_task", t, "Tugas dimulai. Baca instruksi lalu kerjakan sebelum waktu habis.");
  }
  function done(t: Board) {
    if (!window.confirm("Yakin tugas ini sudah selesai dikerjakan?")) return;
    run("submit_task", t, "Terkirim. Menunggu pemeriksaan admin.");
  }

  if (loading || !profile) return <Loading />;

  return (
    <Shell profile={profile} active="tugas">
      <section className="m-card">
        <div className="m-title-row">
          <span className="m-title-ic"><Send size={26} /></span>
          <div><h1>Daftar Tugas</h1><p>Pilih tugas, tekan Kerjakan untuk membuka instruksinya, lalu kirim sebelum waktu habis.</p></div>
        </div>
        <label className="m-search"><Search size={19} /><input placeholder="Cari tugas..." value={q} onChange={e => setQ(e.target.value)} /></label>
        {msg && <div className={`notice ${msg.ok ? "success" : ""}`}>{msg.text}</div>}
        {list.length === 0 && <div className="empty"><h3>Belum ada tugas.</h3><p>Tugas baru dari admin akan muncul di sini.</p></div>}

        {list.map(t => {
          const st = myState(t);
          const free = st === "expired" ? true : t.used < t.quota;   // slot milik saya yang kedaluwarsa sudah bebas
          const left = Math.max(0, t.quota - t.used);
          const due = t.my_due_at ? new Date(t.my_due_at).getTime() : 0;
          const working = st === "working";
          const vipLock = t.vip_only && !vip && (st === null || st === "expired");
          const canStart = (st === null || st === "expired") && free && !vipLock;
          const full = (st === null || st === "expired") && !free && !vipLock;

          return (
            <article key={t.id} className={`m-task ${full ? "taken" : ""} ${working ? "active" : ""}`}>
              <div className="task-meta">
                <span className="tag">
                  {vipLock ? "KHUSUS VIP" : working ? "SEDANG KAMU KERJAKAN" : st === "submitted" || st === "approved" ? "TUGAS KAMU" : st === "rejected" ? "DITOLAK" : full ? "KUOTA PENUH" : "TUGAS TERSEDIA"}
                </span>
                <span className="date"><Timer size={12} /> {t.duration_minutes} mnt</span>
              </div>
              <h3>{t.title}</h3>
              <div className="m-price">
                {vip
                  ? <><b>{rupiah(boost(t.reward))}</b> <small>/ tugas · VIP +{pct}%</small></>
                  : <><b>{rupiah(t.reward)}</b> <small>/ tugas</small>{pct > 0 && <div className="m-vip-hint"><Crown size={13} /> VIP: {rupiah(boost(t.reward))}</div>}</>}
              </div>
              <div className="m-quota"><Users size={14} /> Sisa kuota <b>{st === "expired" && t.used >= t.quota ? 1 : left}</b> dari {t.quota}</div>

              {(working || st === "submitted" || st === "approved") && (
                <div className="m-instr">
                  <small>INSTRUKSI</small>
                  <p>{details[t.id] ?? "Memuat instruksi..."}</p>
                </div>
              )}
              {working && <div className="m-timer"><Timer size={16} /> Sisa waktu <b>{fmt(due - now)}</b></div>}

              {working && (
                <button className="m-btn" disabled={busy === t.id} onClick={() => done(t)}>
                  {busy === t.id ? "Memproses..." : <><CheckCircle2 size={18} /> Sudah Dikerjakan</>}
                </button>
              )}
              {st === "submitted" && <button className="m-btn ghost" disabled><Hourglass size={18} /> Menunggu pemeriksaan</button>}
              {st === "approved" && <button className="m-btn ghost" disabled><CheckCircle2 size={18} /> Disetujui</button>}
              {st === "rejected" && <button className="m-btn ghost" disabled><XCircle size={18} /> Ditolak, tidak bisa diulang</button>}
              {vipLock && <Link href="/vip" className="m-btn vip"><Crown size={18} /> Khusus VIP · Upgrade</Link>}
              {full && <button className="m-btn ghost" disabled><Lock size={18} /> Kuota sudah penuh</button>}
              {canStart && (
                <button className="m-btn" disabled={busy === t.id} onClick={() => start(t)}>
                  {busy === t.id ? "Memproses..." : <><Play size={18} /> Kerjakan <ChevronRight size={18} /></>}
                </button>
              )}
            </article>
          );
        })}
      </section>
    </Shell>
  );
    }
