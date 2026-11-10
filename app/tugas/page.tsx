"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { rupiah } from "@/lib/format";
import { Search, Send, ChevronRight, Lock, Hourglass, CheckCircle2, Timer, Play } from "lucide-react";

type Task = {
  id: string; title: string; reward: number; duration_minutes: number; status: string;
  claimed_by: string | null; claimed_at: string | null; due_at: string | null; submitted_at: string | null;
  created_at: string;
};

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), d = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(d)}` : `${p(m)}:${p(d)}`;
};

export default function TugasPage() {
  const { profile, loading } = useProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("submissions").select("task_id,status").eq("user_id", profile.id)
    ]);
    setTasks((t || []) as Task[]);
    setMine(Object.fromEntries((s || []).map(x => [x.task_id, x.status])));
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    load();
    const ch = supabase.channel("tasks-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => load())
      .subscribe();
    const timer = setInterval(load, 20000);
    return () => { supabase.removeChannel(ch); clearInterval(timer); };
  }, [profile, load]);

  // Tugas milik saya yang instruksinya boleh dibuka (sedang dikerjakan / sudah dikirim)
  const openIds = useMemo(() => {
    if (!profile) return "";
    return tasks
      .filter(t => t.claimed_by === profile.id && (t.submitted_at || (t.due_at && new Date(t.due_at).getTime() > now)))
      .map(t => t.id).sort().join(",");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, profile, Math.floor(now / 5000)]);

  useEffect(() => {
    if (!openIds) { setDetails({}); return; }
    supabase.from("task_details").select("task_id,instructions").in("task_id", openIds.split(","))
      .then(({ data }) => setDetails(Object.fromEntries((data || []).map(d => [d.task_id, d.instructions]))));
  }, [openIds]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return tasks.filter(t => !k || t.title.toLowerCase().includes(k));
  }, [tasks, q]);

  async function run(fn: "claim_task" | "submit_task", t: Task, okText: string) {
    setBusy(t.id); setMsg(null);
    const { error } = await supabase.rpc(fn, { p_task_id: t.id });
    setBusy(null);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: okText });
    await load();
  }
  function start(t: Task) {
    if (!window.confirm(`Kerjakan "${t.title}"? Waktumu ${t.duration_minutes} menit dan tugas ini akan terkunci untuk user lain.`)) return;
    run("claim_task", t, "Tugas dimulai. Baca instruksi lalu kerjakan sebelum waktu habis.");
  }
  function done(t: Task) {
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
          const due = t.due_at ? new Date(t.due_at).getTime() : 0;
          const isMine = t.claimed_by === profile.id;
          const submitted = !!t.claimed_by && !!t.submitted_at;
          const working = !!t.claimed_by && !t.submitted_at && due > now;
          const available = !t.claimed_by || (!t.submitted_at && due <= now);
          const myWorking = isMine && working;
          const mySubmitted = isMine && submitted;
          const taken = !isMine && !available;
          const m = mine[t.id];

          return (
            <article key={t.id} className={`m-task ${taken ? "taken" : ""} ${myWorking ? "active" : ""}`}>
              <div className="task-meta">
                <span className="tag">
                  {myWorking ? "SEDANG KAMU KERJAKAN" : mySubmitted ? "TUGAS KAMU" : working ? "SEDANG DIKERJAKAN" : submitted ? "SUDAH DIKERJAKAN" : "TUGAS TERSEDIA"}
                </span>
                <span className="date"><Timer size={12} /> {t.duration_minutes} mnt</span>
              </div>
              <h3>{t.title}</h3>
              <div className="m-price"><b>{rupiah(t.reward)}</b> <small>/ tugas</small></div>

              {(myWorking || mySubmitted) && (
                <div className="m-instr">
                  <small>INSTRUKSI</small>
                  <p>{details[t.id] ?? "Memuat instruksi..."}</p>
                </div>
              )}
              {myWorking && <div className="m-timer"><Timer size={16} /> Sisa waktu <b>{fmt(due - now)}</b></div>}

              {myWorking && (
                <button className="m-btn" disabled={busy === t.id} onClick={() => done(t)}>
                  {busy === t.id ? "Memproses..." : <><CheckCircle2 size={18} /> Sudah Dikerjakan</>}
                </button>
              )}
              {mySubmitted && (
                <button className="m-btn ghost" disabled>
                  {m === "approved" ? <><CheckCircle2 size={18} /> Disetujui</> : <><Hourglass size={18} /> Menunggu pemeriksaan</>}
                </button>
              )}
              {!isMine && working && <button className="m-btn ghost" disabled><Lock size={18} /> Sedang dikerjakan user lain</button>}
              {!isMine && submitted && <button className="m-btn ghost" disabled><Lock size={18} /> Sudah dikerjakan user lain</button>}
              {available && (
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
