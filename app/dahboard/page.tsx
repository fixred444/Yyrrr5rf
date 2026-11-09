 "use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Home, ClipboardList, Wallet, UserRound, LogOut, Search, Send, Clock3, CheckCircle2 } from "lucide-react";

type Task = { id:string; title:string; description:string; reward:number; status:string; created_at:string };
type Profile = { full_name:string|null; role:string; balance:number };

export default function Dashboard() {
  const router=useRouter();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [history,setHistory]=useState<any[]>([]);
  const [query,setQuery]=useState("");
  const [tab,setTab]=useState("tasks");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");

  async function load() {
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/auth");return;}
    const [{data:p},{data:t},{data:s}] = await Promise.all([
      supabase.from("profiles").select("full_name,role,balance").eq("id",user.id).single(),
      supabase.from("tasks").select("*").eq("status","active").order("created_at",{ascending:false}),
      supabase.from("submissions").select("id,status,created_at,tasks(title,reward)").eq("user_id",user.id).order("created_at",{ascending:false})
    ]);
    setProfile(p as Profile); setTasks((t||[]) as Task[]); setHistory(s||[]); setLoading(false);
  }
  useEffect(()=>{load();},[]);
  async function apply(task:Task) {
    setBusy(task.id);setNotice("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const {error}=await supabase.from("submissions").insert({task_id:task.id,user_id:user.id,status:"pending"});
    if(error) setNotice(error.code==="23505"?"Kamu sudah mengajukan tugas ini.":error.message);
    else {setNotice("Pengajuan berhasil dikirim. Tunggu pemeriksaan admin.");await load();}
    setBusy("");
  }
  async function logout(){await supabase.auth.signOut();router.replace("/auth");}
  const visible=tasks.filter(t=>(t.title+" "+t.description).toLowerCase().includes(query.toLowerCase()));
  if(loading)return <div className="loading">Memuat ruang kerja...</div>;
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-icon"><Send size={21}/></div><span>S3L <b>ZERO99</b></span></div><div className="top-actions"><span className="user-chip">{profile?.full_name||"Pengguna"}</span><button className="icon-btn" onClick={logout} aria-label="Keluar"><LogOut size={19}/></button></div></header>
    <section className="welcome"><div><div className="eyebrow">DASHBOARD PENGGUNA</div><h1>Halo, {profile?.full_name?.split(" ")[0]||"Teman"} 👋</h1><p className="muted">Temukan tugas yang tersedia dan pantau pengajuanmu.</p></div><div className="balance-card"><span>Saldo tercatat</span><strong>Rp{Number(profile?.balance||0).toLocaleString("id-ID")}</strong><small>Saldo diperbarui setelah admin menyetujui tugas.</small></div></section>
    <nav className="tabs">
      <button className={tab==="tasks"?"selected":""} onClick={()=>setTab("tasks")}><ClipboardList size={17}/> Daftar tugas</button>
      <button className={tab==="history"?"selected":""} onClick={()=>setTab("history")}><Clock3 size={17}/> Riwayat</button>
      <button className={tab==="profile"?"selected":""} onClick={()=>setTab("profile")}><UserRound size={17}/> Profil</button>
      {profile?.role==="admin"&&<button onClick={()=>router.push("/admin")}><Home size={17}/> Panel admin</button>}
    </nav>
    {notice&&<div className="notice notice-wide">{notice}</div>}
    {tab==="tasks"&&<section className="content-card"><div className="section-head"><div><h2>Daftar tugas</h2><p className="muted">Pilih tugas, baca instruksi, lalu ajukan setelah selesai.</p></div><span className="count">{visible.length} tersedia</span></div><div className="search"><Search size={19}/><input placeholder="Cari tugas..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
      {visible.length===0?<div className="empty"><div className="empty-icon"><ClipboardList/></div><h3>Belum ada tugas tersedia</h3><p>Admin belum menerbitkan tugas. Silakan cek kembali nanti.</p></div>:<div className="task-grid">{visible.map(t=><article className="task-card" key={t.id}><div className="task-meta"><span className="tag">TUGAS TERSEDIA</span><span className="date">{new Date(t.created_at).toLocaleDateString("id-ID")}</span></div><h3>{t.title}</h3><p>{t.description}</p><div className="task-bottom"><strong>Rp{Number(t.reward).toLocaleString("id-ID")} <small>/ tugas</small></strong><button className="primary" disabled={busy===t.id} onClick={()=>apply(t)}>{busy===t.id?"Mengirim...":"Sudah dikerjakan"} <span>→</span></button></div></article>)}</div>}
    </section>}
    {tab==="history"&&<section className="content-card"><h2>Riwayat pengajuan</h2><p className="muted">Status setiap tugas yang kamu kirim.</p>{history.length===0?<div className="empty"><h3>Belum ada riwayat</h3><p>Pengajuan tugas akan muncul di sini.</p></div>:<div className="history-list">{history.map((x:any)=><div className="history-row" key={x.id}><div><b>{x.tasks?.title||"Tugas"}</b><small>{new Date(x.created_at).toLocaleString("id-ID")}</small></div><span className={"status "+x.status}>{x.status==="approved"?"Disetujui":x.status==="rejected"?"Ditolak":"Menunggu"}</span></div>)}</div>}</section>}
    {tab==="profile"&&<section className="content-card profile-card"><h2>Profil akun</h2><div className="profile-line"><span>Nama</span><b>{profile?.full_name||"-"}</b></div><div className="profile-line"><span>Peran</span><b>{profile?.role==="admin"?"Administrator":"Pengguna"}</b></div><div className="profile-line"><span>Saldo</span><b>Rp{Number(profile?.balance||0).toLocaleString("id-ID")}</b></div><button className="secondary" onClick={logout}>Keluar dari akun</button></section>}
    <footer className="footer">S3L ZERO99 <span>•</span> Pusat tugas dan aktivitas</footer>
  </main>;
}
