"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { dateTime, rupiah, STATUS_LABEL } from "@/lib/format";
import { Plus, Trash2, Check, X, Eye, EyeOff, ClipboardList, Inbox, Banknote, Users } from "lucide-react";

type Task = { id: string; title: string; reward: number; duration_minutes: number; quota: number; status: string; created_at: string; task_details: { instructions: string } | { instructions: string }[] | null };
type Claim = { task_id: string; user_id: string; status: string; claimed_at: string; due_at: string; submitted_at: string | null; user: { full_name: string | null; email: string | null } | null };
type Det = { instructions: string } | { instructions: string }[] | null;
type Sub = { id: string; status: string; created_at: string; task_id: string; user_id: string; task: { title: string; reward: number; duration_minutes: number; task_details: Det } | null; user: { full_name: string | null; email: string | null } | null };
type Wd = { id: string; method: string; account_number: string; amount: number; status: string; created_at: string; user: { full_name: string | null; email: string | null } | null };
type Usr = { id: string; full_name: string | null; email: string | null; role: string; balance: number; created_at: string };
type Tab = "tugas" | "review" | "tarik" | "user";

export default function Admin() {
  const { profile, loading } = useProfile(true);
  const [tab, setTab] = useState<Tab>("tugas");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [wds, setWds] = useState<Wd[]>([]);
  const [users, setUsers] = useState<Usr[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [reward, setReward] = useState("4000");
  const [duration, setDuration] = useState("60");
  const [quota, setQuota] = useState("1");
  const [bonus, setBonus] = useState("500");
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const load = useCallback(async () => {
    const [t, s, w, u, c] = await Promise.all([
      supabase.from("tasks").select("*,task_details(instructions)").order("created_at", { ascending: false }),
      supabase.from("submissions").select("id,status,created_at,task_id,user_id,task:tasks(title,reward,duration_minutes,task_details(instructions)),user:profiles(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*,user:profiles(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email,role,balance,created_at").order("created_at", { ascending: false }),
      supabase.from("task_claims").select("task_id,user_id,status,claimed_at,due_at,submitted_at,user:profiles(full_name,email)").order("claimed_at", { ascending: false })
    ]);
    setTasks((t.data || []) as Task[]);
    setSubs((s.data || []) as unknown as Sub[]);
    setWds((w.data || []) as unknown as Wd[]);
    setUsers((u.data || []) as Usr[]);
    setClaims((c.data || []) as unknown as Claim[]);
  }, []);

  useEffect(() => { if (profile) load(); }, [profile, load]);
  useEffect(() => {
    if (!profile) return;
    supabase.from("app_settings").select("value").eq("key", "referral_bonus").maybeSingle()
      .then(({ data }) => setBonus(data?.value ?? "500"));
  }, [profile]);

  if (loading || !profile) return <Loading />;

  const flash = (ok: boolean, text: string) => setMsg({ ok, text });
  const insOf = (d: Det | undefined) => (Array.isArray(d) ? d[0]?.instructions : d?.instructions) || "(tanpa instruksi)";
  const used = (a: string | null | undefined, b: string | null | undefined) =>
    a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)) : null;
  const claimsOf = (taskId: string) => claims.filter(c => c.task_id === taskId);
  const isUsed = (c: Claim) => c.status === "submitted" || c.status === "approved" || (c.status === "working" && new Date(c.due_at).getTime() > Date.now());
  const usedOf = (taskId: string) => claimsOf(taskId).filter(isUsed).length;
  const claimLabel = (c: Claim) => {
    if (c.status === "working") return new Date(c.due_at).getTime() > Date.now() ? `Sedang mengerjakan, sampai ${dateTime(c.due_at)}` : "Waktu habis (slot dibuka lagi)";
    return ({ submitted: "Sudah dikirim", approved: "Disetujui", rejected: "Ditolak" } as Record<string, string>)[c.status] || c.status;
  };
  const claimOfSub = (s: Sub) => claims.find(c => c.task_id === s.task_id && c.user_id === s.user_id);

  async function addTask(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const r = Number(reward) || 0;
    const d = Number(duration) || 0;
    const qt = Number(quota) || 0;
    if (d < 1) return flash(false, "Durasi minimal 1 menit.");
    if (qt < 1) return flash(false, "Kuota minimal 1.");
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
      const { error } = await supabase.rpc("create_tasks", { p_titles: [it.title], p_instructions: it.ins, p_reward: r, p_duration: d, p_quota: qt });
      if (error) return flash(false, error.message);
    }
    flash(true, `${items.length} tugas ditambahkan.`);
    setTitle(""); setBulkText(""); setDesc("");
    load();
  }

  async function saveBonus() {
    const { error } = await supabase.from("app_settings").upsert({ key: "referral_bonus", value: String(Number(bonus) || 0) });
    flash(!error, error ? error.message : "Bonus referral disimpan.");
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
    flash(!error, error ? error.message : status === "approved" ? "Disetujui, saldo user bertambah." : "Ditolak, slot kuota dibuka lagi.");
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
              <input className="plain-input" inputMode="numeric" placeholder="Kuota (berapa user berbeda yang boleh mengerjakan)" value={quota} onChange={e => setQuota(e.target.value.replace(/\D/g, ""))} />
              <button className="m-btn" type="submit">Tambah Tugas</button>
            </form>
            <p className="muted sm">Di luar, user hanya melihat judul. Instruksi muncul setelah user menekan Kerjakan. Tugas bisa dikerjakan sebanyak kuota, oleh akun yang berbeda-beda; satu akun hanya sekali. Jika waktu habis atau kamu tolak, slot kuotanya dibuka lagi untuk user lain.</p>
          </section>

          <section className="m-card">
            <h2 className="m-h2">Daftar Tugas ({tasks.length})</h2>
            {tasks.length === 0 && <p className="center muted">Belum ada tugas.</p>}
            {tasks.map(t => (
              <div key={t.id} className="admin-wrap">
              <div className="admin-task">
                <div className="grow">
                  <b>{t.title}</b>
                  <small>{rupiah(t.reward)} · {t.duration_minutes} mnt · {t.status === "active" ? "Aktif" : "Nonaktif"} · Kuota {usedOf(t.id)}/{t.quota}</small>
                </div>
                <button className="icon-btn" title={t.status === "active" ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggle(t)}>{t.status === "active" ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                <button className="icon-btn danger" title="Hapus" onClick={() => del(t)}><Trash2 size={18} /></button>
              </div>
              <button className="link-btn" onClick={() => setOpenId(openId === t.id ? null : t.id)}>{openId === t.id ? "Tutup tugas" : "Buka tugas"}</button>
              {openId === t.id && (
                <div className="m-instr">
                  <small>INSTRUKSI</small>
                  <p>{insOf(t.task_details)}</p>
                  <small>PEMANTAUAN · KUOTA {usedOf(t.id)}/{t.quota}</small>
                  {claimsOf(t.id).length === 0 && <p>Belum ada yang mengambil.</p>}
                  {claimsOf(t.id).map(c => (
                    <p key={c.user_id}>{`${c.user?.full_name || "-"} (${c.user?.email})\n${claimLabel(c)}\nMulai: ${dateTime(c.claimed_at)}`}{c.submitted_at ? `\nDikirim: ${dateTime(c.submitted_at)}${used(c.claimed_at, c.submitted_at) !== null ? ` (${used(c.claimed_at, c.submitted_at)} menit dari ${t.duration_minutes} menit)` : ""}` : ""}</p>
                  ))}
                </div>
              )}
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
            <div key={s.id} className="admin-wrap">
            <div className="submission-row">
              <div className="submission-info">
                <b>{s.task?.title || "Tugas dihapus"}</b>
                <span>{s.user?.full_name || "-"} · {s.user?.email}</span>
                <small>{dateTime(s.created_at)} · {rupiah(s.task?.reward)}</small>
                <button className="link-btn" onClick={() => setOpenId(openId === s.id ? null : s.id)}>{openId === s.id ? "Tutup tugas" : "Buka tugas"}</button>
              </div>
              {s.status === "pending" ? (
                <div className="submission-actions">
                  <button className="approve" onClick={() => review(s.id, "approved")}><Check size={15} /> Setujui</button>
                  <button className="reject" onClick={() => review(s.id, "rejected")}><X size={15} /> Tolak</button>
                </div>
              ) : <span className={`status ${s.status}`}>{STATUS_LABEL[s.status]}</span>}
            </div>
            {openId === s.id && s.task && (
              <div className="m-instr">
                <small>INSTRUKSI</small>
                <p>{insOf(s.task.task_details)}</p>
                <small>RINCIAN</small>
                <p>{`Imbalan ${rupiah(s.task.reward)} · durasi ${s.task.duration_minutes} menit`}{claimOfSub(s) ? `\nMulai dikerjakan: ${dateTime(claimOfSub(s)!.claimed_at)}` : ""}{`\nDikirim: ${dateTime(s.created_at)}`}{used(claimOfSub(s)?.claimed_at, s.created_at) !== null ? ` (${used(claimOfSub(s)?.claimed_at, s.created_at)} menit)` : ""}{`\nPengerja: ${s.user?.full_name || "-"} (${s.user?.email})`}</p>
              </div>
            )}
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
          <h2 className="m-h2">Bonus Referral</h2>
          <div className="m-inline">
            <input className="plain-input" inputMode="numeric" placeholder="Bonus (Rp)" value={bonus} onChange={e => setBonus(e.target.value.replace(/\D/g, ""))} />
            <button className="m-btn sm" onClick={saveBonus}>Simpan</button>
          </div>
          <p className="muted sm">Dibayar ke pengajak setiap kali satu tugas orang yang diajak disetujui.</p>
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
