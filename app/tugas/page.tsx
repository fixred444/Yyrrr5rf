"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { rupiah } from "@/lib/format";
import { Search, Send, ChevronRight, Lock, Hourglass, CheckCircle2 } from "lucide-react";

type Task = { id: string; title: string; description: string; reward: number; status: string; claimed_by: string | null; created_at: string };

export default function TugasPage() {
  const { profile, loading } = useProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return tasks.filter(t => !k || t.title.toLowerCase().includes(k) || t.description.toLowerCase().includes(k));
  }, [tasks, q]);

  async function claim(t: Task) {
    if (!window.confirm(`Tandai "${t.title}" sebagai sudah kamu kerjakan? Tugas ini tidak bisa dikerjakan user lain lagi.`)) return;
    setBusy(t.id); setMsg(null);
    const { error } = await supabase.rpc("claim_task", { p_task_id: t.id });
    setBusy(null);
    if (error) setMsg({ ok: false, text: error.message });
    else setMsg({ ok: true, text: "Berhasil dikirim. Menunggu pemeriksaan admin." });
    load();
  }

  if (loading || !profile) return <Loading />;

  const button = (t: Task) => {
    const m = mine[t.id];
    if (t.claimed_by === profile.id || m) {
      if (m === "approved") return <button className="m-btn ghost" disabled><CheckCircle2 size={18} /> Disetujui</button>;
      return <button className="m-btn ghost" disabled><Hourglass size={18} /> Menunggu pemeriksaan</button>;
    }
    if (t.claimed_by) return <button className="m-btn ghost" disabled><Lock size={18} /> Sudah dikerjakan user lain</button>;
    return (
      <button className="m-btn" disabled={busy === t.id} onClick={() => claim(t)}>
        {busy === t.id ? "Memproses..." : <>Sudah Dikerjakan <ChevronRight size={18} /></>}
      </button>
    );
  };

  return (
    <Shell profile={profile} active="tugas">
      <section className="m-card">
        <div className="m-title-row">
          <span className="m-title-ic"><Send size={26} /></span>
          <div><h1>Daftar Tugas</h1><p>Pilih tugas yang tersedia, baca instruksi, lalu tandai setelah selesai.</p></div>
        </div>
        <label className="m-search"><Search size={19} /><input placeholder="Cari tugas..." value={q} onChange={e => setQ(e.target.value)} /></label>
        {msg && <div className={`notice ${msg.ok ? "success" : ""}`}>{msg.text}</div>}
        {list.length === 0 && <div className="empty"><h3>Belum ada tugas.</h3><p>Tugas baru dari admin akan muncul di sini.</p></div>}
        {list.map(t => {
          const taken = !!t.claimed_by && t.claimed_by !== profile.id;
          return (
            <article key={t.id} className={`m-task ${taken ? "taken" : ""}`}>
              <div className="task-meta">
                <span className="tag">{taken ? "SUDAH DIAMBIL" : t.claimed_by === profile.id ? "TUGAS KAMU" : "TUGAS TERSEDIA"}</span>
                <span className="date">{new Date(t.created_at).getFullYear()}</span>
              </div>
              <h3>{t.title}</h3>
              <p>{t.description}</p>
              <div className="m-price"><b>{rupiah(t.reward)}</b> <small>/ tugas</small></div>
              {button(t)}
            </article>
          );
        })}
      </section>
    </Shell>
  );
}
