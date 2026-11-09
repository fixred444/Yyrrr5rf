"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { dateTime, rupiah, STATUS_LABEL } from "@/lib/format";

type Row = { id: string; status: string; created_at: string; task: { title: string; reward: number } | null };

export default function Riwayat() {
  const { profile, loading } = useProfile();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("all");

  useEffect(() => {
    if (!profile) return;
    supabase.from("submissions").select("id,status,created_at,task:tasks(title,reward)")
      .eq("user_id", profile.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data || []) as unknown as Row[]));
  }, [profile]);

  const count = (s: string) => rows.filter(r => r.status === s).length;

  const list = useMemo(() => {
    const now = Date.now();
    const days = range === "today" ? 1 : range === "7" ? 7 : range === "30" ? 30 : 0;
    return rows.filter(r =>
      (status === "all" || r.status === status) &&
      (!days || now - new Date(r.created_at).getTime() <= days * 86400000) &&
      (!q.trim() || (r.task?.title || "").toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [rows, q, status, range]);

  if (loading || !profile) return <Loading />;

  const chip = (cur: string, set: (v: string) => void, v: string, label: string) =>
    <button key={v} className={`m-seg-b ${cur === v ? "on" : ""}`} onClick={() => set(v)}>{label}</button>;

  return (
    <Shell profile={profile} active="riwayat">
      <section className="m-card">
        <label className="m-search"><input placeholder="Cari tugas..." value={q} onChange={e => setQ(e.target.value)} /></label>
        <div className="m-seg">
          {chip(status, setStatus, "all", "Semua")}
          {chip(status, setStatus, "pending", `Pending (${count("pending")})`)}
          {chip(status, setStatus, "approved", `Diterima (${count("approved")})`)}
          {chip(status, setStatus, "rejected", `Ditolak (${count("rejected")})`)}
        </div>
        <div className="m-seg">
          {chip(range, setRange, "all", "Semua")}
          {chip(range, setRange, "today", "Hari ini")}
          {chip(range, setRange, "7", "7 Hari")}
          {chip(range, setRange, "30", "30 Hari")}
        </div>
        <div className="m-box">
          {list.length === 0 && <p className="center muted">Belum ada setoran.</p>}
          {list.map(r => (
            <div key={r.id} className="history-row">
              <div><b>{r.task?.title || "Tugas dihapus"}</b><small>{dateTime(r.created_at)} · {rupiah(r.task?.reward)}</small></div>
              <span className={`status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
