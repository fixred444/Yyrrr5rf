 "use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, ClipboardCheck, Users, LogOut } from "lucide-react";

export default function AdminPage(){
 const router=useRouter();const [allowed,setAllowed]=useState(false);const [loading,setLoading]=useState(true);
 const [tasks,setTasks]=useState<any[]>([]);const [subs,setSubs]=useState<any[]>([]);
 const [title,setTitle]=useState("");const [description,setDescription]=useState("");const [reward,setReward]=useState("4000");const [notice,setNotice]=useState("");const [busy,setBusy]=useState("");
 async function load(){
  const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace("/auth");return;}
  const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  if(p?.role!=="admin"){router.replace("/dashboard");return;}
  setAllowed(true);
  const [{data:t},{data:s}]=await Promise.all([
   supabase.from("tasks").select("*").order("created_at",{ascending:false}),
   supabase.from("submissions").select("id,status,created_at,user_id,tasks(title,reward),profiles(full_name,email)").order("created_at",{ascending:false})
  ]);
  setTasks(t||[]);setSubs(s||[]);setLoading(false);
 }
 useEffect(()=>{load();},[]);
 async function createTask(e:React.FormEvent){e.preventDefault();setNotice("");const {error}=await supabase.from("tasks").insert({title,description,reward:Number(reward),status:"active"});if(error)setNotice(error.message);else{setTitle("");setDescription("");setNotice("Tugas berhasil diterbitkan.");load();}}
 async function setStatus(id:string,status:"approved"|"rejected"){setBusy(id);const {error}=await supabase.rpc("review_submission",{submission_id:id,new_status:status});setNotice(error?error.message:status==="approved"?"Pengajuan disetujui dan saldo ditambahkan.":"Pengajuan ditolak.");await load();setBusy("");}
 async function toggleTask(t:any){const {error}=await supabase.from("tasks").update({status:t.status==="active"?"inactive":"active"}).eq("id",t.id);setNotice(error?.message||"Status tugas diperbarui.");load();}
 async function logout(){await supabase.auth.signOut();router.replace("/auth");}
 if(loading)return <div className="loading">Memeriksa akses administrator...</div>;
 if(!allowed)return null;
 return <main className="app-shell">
  <header className="topbar"><div className="brand"><div className="brand-icon"><ClipboardCheck size={21}/></div><span>ADMIN <b>S3L ZERO99</b></span></div><div className="top-actions"><button className="secondary compact" onClick={()=>router.push("/dashboard")}><ArrowLeft size={16}/> Dashboard</button><button className="icon-btn" onClick={logout}><LogOut size={18}/></button></div></header>
  <section className="welcome"><div><div className="eyebrow">ADMINISTRATOR</div><h1>Panel pengelolaan</h1><p className="muted">Kelola tugas dan periksa pengajuan pengguna.</p></div><div className="balance-card"><span>Total tugas</span><strong>{tasks.length}</strong><small>{subs.filter(s=>s.status==="pending").length} pengajuan menunggu</small></div></section>
  {notice&&<div className="notice notice-wide">{notice}</div>}
  <div className="admin-grid">
   <section className="content-card"><div className="section-head"><div><h2><Plus size={20}/> Buat tugas baru</h2><p className="muted">Tugas langsung tampil untuk pengguna setelah diterbitkan.</p></div></div>
    <form className="form" onSubmit={createTask}><label>Nama tugas<input className="plain-input" required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Isi survei layanan"/></label><label>Instruksi tugas<textarea className="plain-input" rows={5} required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Jelaskan langkah-langkah dan bukti yang perlu dikirim."/></label><label>Imbalan (Rp)<input className="plain-input" type="number" min="0" required value={reward} onChange={e=>setReward(e.target.value)}/></label><button className="primary full">Terbitkan tugas</button></form>
   </section>
   <section className="content-card"><h2><ClipboardCheck size={20}/> Daftar tugas</h2><p className="muted">Aktifkan atau nonaktifkan tugas.</p>{tasks.length===0?<div className="empty compact-empty">Belum ada tugas. Buat tugas pertama.</div>:tasks.map(t=><div className="admin-task" key={t.id}><div><b>{t.title}</b><small>Rp{Number(t.reward).toLocaleString("id-ID")} • {t.status==="active"?"Aktif":"Nonaktif"}</small></div><button className="secondary compact" onClick={()=>toggleTask(t)}>{t.status==="active"?"Nonaktifkan":"Aktifkan"}</button></div>)}</section>
  </div>
  <section className="content-card submissions"><div className="section-head"><div><h2><Users size={20}/> Pengajuan pengguna</h2><p className="muted">Setujui hanya setelah pekerjaan benar-benar diperiksa.</p></div><span className="count">{subs.length} pengajuan</span></div>
   {subs.length===0?<div className="empty"><p>Belum ada pengajuan tugas.</p></div>:subs.map(s=><div className="submission-row" key={s.id}><div className="submission-info"><b>{s.tasks?.title||"Tugas"}</b><span>{s.profiles?.full_name||"Pengguna"} • {s.profiles?.email||s.user_id}</span><small>{new Date(s.created_at).toLocaleString("id-ID")} • Rp{Number(s.tasks?.reward||0).toLocaleString("id-ID")}</small></div><div className="submission-actions">{s.status==="pending"?<><button className="approve" disabled={busy===s.id} onClick={()=>setStatus(s.id,"approved")}>Setujui</button><button className="reject" disabled={busy===s.id} onClick={()=>setStatus(s.id,"rejected")}>Tolak</button></>:<span className={"status "+s.status}>{s.status==="approved"?"Disetujui":"Ditolak"}</span>}</div></div>)}
  </section>
  <footer className="footer">Panel administrator • S3L ZERO99</footer>
 </main>;
}
