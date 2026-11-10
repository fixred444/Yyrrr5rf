"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { dateTime, rupiah, STATUS_LABEL } from "@/lib/format";
import { Plus, Trash2, Check, X, Eye, EyeOff, ClipboardList, Inbox, Banknote, Users } from "lucide-react";

type Task = { id: string; title: string; reward: number; duration_minutes: number; status: string; claimed_by: string | null; due_at: string | null; submitted_at: string | null; created_at: string; task_details: { instructions: string } | { instructions: string }[] | null };
type Sub = { id: string; status: string; created_at: string; task: { title: string; reward: number } | null; user: { full_name: string | null; email: string | null } | null };
type Wd = { id: string; method: string; account_number: string; amount: number; status: string; created_at: string; user: { full_name: string | null; email: string | null } | null };
type Usr = { id: string; full_name: string | null; email: string | null; role: string; balance: number; created_at: string };
type Tab = "tugas" | "review" | "tarik" | "user";

export default function Admin() {
  const { profile, loading } = useProfile(true);
  const [tab, setTab] = useState<Tab>("tugas");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [wds, setWds] = useState<Wd[]>([]);
  const [users, setUsers] = useState<Usr[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [reward, setReward] = useState("4000");
  const [duration, setDuration] = useState("60");
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const load = useCallback(async () => {
    const [t, s, w, u] = await Promise.all([
      supabase.from("tasks").select("*,task_details(instructions)").order("created_at", { ascending: false }),
      supabase.from("submissions").select("id,status,created_at,task:tasks(title,reward),user:profiles(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*,user:profiles(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email,role,balance,created_at").order("created_at", { ascending: false })
    ]);
    setTasks((t.data || []) as Task[]);
    setSubs((s.data || []) as unknown as Sub[]);
    setWds((w.data || []) as unknown as Wd[]);
    setUsers((u.data || []) as Usr[]);
  }, []);

  useEffect(() => { if (profile) load(); }, [profile, load]);

  if (loading || !profile) return <Loading />;

  const nameOf = (id: string | null) => {
    const u = users.find(x => x.id === id);
    return u ? (u.full_name || u.email || "user") : "-";
  };
  const flash = (ok: boolean, text: string) => setMsg({ ok, text });
  const stateOf = (t: Task) => {
    if (!t.claimed_by) return "Belum diambil";
    const who = nameOf(t.claimed_by);
    if (t.submitted_at) return `Sudah dikirim: ${who}`;
    if (t.due_at && new Date(t.due_at).getTime() > Date.now()) return `Dikerjakan ${who} sampai ${dateTime(t.due_at)}`;
    return "Waktu habis (tersedia lagi)";
  };

  async function addTask(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const r = Number(reward) || 0;
    const d = Number(duration) || 0;
    if (d < 1) return flash(false, "Durasi minimal 1 menit.");
    let items: { title: string; ins: string }[];
    if (bulk) {
      items = bulkText.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
        const i = l.indexOf("|");
        return i >= 0 ? { title: l.slice(0, i).trim(), ins: l.slice(i + 1).trim() || desc.trim() } : { title: l, ins: desc.trim() };
      });
      if (!items.length) return flash(false, "Isi minimal satu baris tugas.");
    } else {
      if (!title.trim()) return flash(false, "Judul tugas wajib diisi.");
      if (!desc.trim()) return flash(false, "Instruksi tugas wajib diisi.");
      items = [{ title: title.trim(), ins: desc.trim() }];
    }
    for (const it of items) {
      const { error } = await supabase.rpc("create_tasks", { p_titles: [it.title], p_instructions: it.ins, p_reward: r, p_duration: d });
      if (error) return flash(false, error.message);
    }
    flash(true, `${items.length} tugas ditambahkan.`);
    setTitle(""); setBulkText(""); setDesc("");
    load();
  }

  async function toggle(t: Task) {
    const { error } = await supabase.from("tasks").update({ status: t.status === "active" ? "inactive" : "active" }).eq("id", t.id);
    if (error) flash(false, error.message); load();
  }
  async function del(t: Task) {
    if (!window.confirm(`Hapus tugas "${t.title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) flash(false, error.message); load();
  }
  async function review(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.rpc("review_submission", { submission_id: id, new_status: status });
    flash(!error, error ? error.message : status === "approved" ? "Disetujui, saldo user bertambah." : "Ditolak, tugas dibuka lagi.");
    load();
  }
  async function reviewWd(id: string, status: "paid" | "rejected") {
    const { error } = await supabase.rpc("review_withdrawal", { p_id: id, p_status: status });
    flash(!error, error ? error.message : status === "paid" ? "Ditandai sudah dibayar." : "Ditolak, saldo dikembalikan.");
    load();
  }

  const pendingSubs = subs.filter(s => s.status === "pending");
  const pendingWds = wds.filter(w => w.status === "pending");
  const tabBtn = (k: Tab, label: string, icon: React.ReactNode, n?: number) => (
    <button key={k} className={`m-tab ${tab === k ? "on" : ""}`} onClick={() => { setTab(k); setMsg(null); }}>
      {icon}{label}{!!n && <span className="m-count">{n}</span>}
    </button>
  );

  return (
    <Shell profile={profile} active="none">
      <section className="m-banner teal">
        <h1>Panel Admin</h1>
        <p>Ketik tugas baru, periksa pengajuan, dan proses penarikan.</p>
      </section>

      <div className="m-tabs">
        {tabBtn("tugas", "Tugas", <ClipboardList size={16} />)}
        {tabBtn("review", "Review", <Inbox size={16} />, pendingSubs.length)}
        {tabBtn("tarik", "Penarikan", <Banknote size={16} />, pendingWds.length)}
        {tabBtn("user", "User", <Users size={16} />)}
      </div>

      {msg && <div className={`notice ${msg.ok ? "success" : ""}`}>{msg.text}</div>}

      {tab === "tugas" && (
        <>
          <section className="m-card">
            <h2 className="m-h2 flex"><Plus size={20} /> Tambah Tugas</h2>
            <form className="form" onSubmit={addTask}>
              <div className="m-seg tight">
                <button type="button" className={`m-seg-b ${!bulk ? "on" : ""}`} onClick={() => setBulk(false)}>Satu tugas</button>
                <button type="button" className={`m-seg-b ${bulk ? "on" : ""}`} onClick={() => setBulk(true)}>Banyak sekaligus</button>
              </div>
              {bulk
                ? <textarea className="plain-input" rows={6} placeholder={"Satu baris = satu tugas\nFormat: Judul | Instruksi\nContoh: Isi survei A | Buka link ... lalu isi"} value={bulkText} onChange={e => setBulkText(e.target.value)} />
                : <input className="plain-input" placeholder="Judul tugas (ini yang tampil di luar)" value={title} onChange={e => setTitle(e.target.value)} />}
              <textarea className="plain-input" rows={4} placeholder={bulk ? "Instruksi umum (dipakai jika baris tidak punya tanda |)" : "Instruksi (hanya tampil setelah user menekan Kerjakan)"} value={desc} onChange={e => setDesc(e.target.value)} />
              <input className="plain-input" inputMode="numeric" placeholder="Imbalan (Rp)" value={reward} onChange={e => setReward(e.target.value.replace(/\D/g, ""))} />
              <input className="plain-input" inputMode="numeric" placeholder="Waktu pengerjaan (menit)" value={duration} onChange={e => setDuration(e.target.value.replace(/\D/g, ""))} />
              <button className="m-btn" type="submit">Tambah Tugas</button>
            </form>
            <p className="muted sm">Di luar, user hanya melihat judul. Instruksi muncul setelah user menekan Kerjakan, dan tugas terkunci untuk user itu selama waktu pengerjaan. Jika waktu habis atau kamu tolak, tugas dibuka lagi.</p>
          </section>

          <section className="m-card">
            <h2 className="m-h2">Daftar Tugas ({tasks.length})</h2>
            {tasks.length === 0 && <p className="center muted">Belum ada tugas.</p>}
            {tasks.map(t => (
              <div key={t.id} className="admin-task">
                <div className="grow">
                  <b>{t.title}</b>
                  <small>{rupiah(t.reward)} · {t.duration_minutes} mnt · {t.status === "active" ? "Aktif" : "Nonaktif"} · {stateOf(t)}</small>
                </div>
                <button className="icon-btn" title={t.status === "active" ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggle(t)}>{t.status === "active" ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                <button className="icon-btn danger" title="Hapus" onClick={() => del(t)}><Trash2 size={18} /></button>
              </div>
            ))}
          </section>
        </>
      )}

      {tab === "review" && (
        <section className="m-card">
          <h2 className="m-h2">Pengajuan ({pendingSubs.length} pending)</h2>
          {subs.length === 0 && <p className="center muted">Belum ada pengajuan.</p>}
          {subs.map(s => (
            <div key={s.id} className="submission-row">
              <div className="submission-info">
                <b>{s.task?.title || "Tugas dihapus"}</b>
                <span>{s.user?.full_name || "-"} · {s.user?.email}</span>
                <small>{dateTime(s.created_at)} · {rupiah(s.task?.reward)}</small>
              </div>
              {s.status === "pending" ? (
                <div className="submission-actions">
                  <button className="approve" onClick={() => review(s.id, "approved")}><Check size={15} /> Setujui</button>
                  <button className="reject" onClick={() => review(s.id, "rejected")}><X size={15} /> Tolak</button>
                </div>
              ) : <span className={`status ${s.status}`}>{STATUS_LABEL[s.status]}</span>}
            </div>
          ))}
        </section>
      )}

      {tab === "tarik" && (
        <section className="m-card">
          <h2 className="m-h2">Permintaan Penarikan ({pendingWds.length} pending)</h2>
          {wds.length === 0 && <p className="center muted">Belum ada penarikan.</p>}
          {wds.map(w => (
            <div key={w.id} className="submission-row">
              <div className="submission-info">
                <b>{rupiah(w.amount)} → {w.method} {w.account_number}</b>
                <span>{w.user?.full_name || "-"} · {w.user?.email}</span>
                <small>{dateTime(w.created_at)}</small>
              </div>
              {w.status === "pending" ? (
                <div className="submission-actions">
                  <button className="approve" onClick={() => reviewWd(w.id, "paid")}><Check size={15} /> Sudah dibayar</button>
                  <button className="reject" onClick={() => reviewWd(w.id, "rejected")}><X size={15} /> Tolak</button>
                </div>
              ) : <span className={`status ${w.status === "paid" ? "approved" : w.status}`}>{STATUS_LABEL[w.status]}</span>}
            </div>
          ))}
        </section>
      )}

      {tab === "user" && (
        <section className="m-card">
          <h2 className="m-h2">Pengguna ({users.length})</h2>
          {users.map(u => (
            <div key={u.id} className="history-row">
              <div><b>{u.full_name || "-"} {u.role === "admin" && <span className="tag">ADMIN</span>}</b><small>{u.email} · bergabung {dateTime(u.created_at)}</small></div>
              <b>{rupiah(u.balance)}</b>
            </div>
          ))}
        </section>
      )}

      <Link href="/dashboard" className="m-back">← Kembali ke tampilan user</Link>
    </Shell>
  );
}
