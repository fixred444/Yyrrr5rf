"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { dateTime } from "@/lib/format";
import { LogOut, Trophy, Pencil, KeyRound, ChevronRight } from "lucide-react";

export default function Profil() {
  const router = useRouter();
  const { profile, loading, reload } = useProfile();
  const [stat, setStat] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState({ a: "", b: "", open: false });

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name || "");
    supabase.from("submissions").select("status").eq("user_id", profile.id).then(({ data }) => {
      const c = (s: string) => (data || []).filter(x => x.status === s).length;
      setStat({ total: data?.length || 0, approved: c("approved"), rejected: c("rejected"), pending: c("pending") });
    });
  }, [profile]);

  if (loading || !profile) return <Loading />;

  async function saveName() {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Nama diperbarui." });
    reload();
  }
  async function savePw() {
    if (pw.a.length < 8) { setMsg({ ok: false, text: "Kata sandi minimal 8 karakter." }); return; }
    if (pw.a !== pw.b) { setMsg({ ok: false, text: "Konfirmasi kata sandi tidak sama." }); return; }
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Kata sandi berhasil dibuat." });
    if (!error) setPw({ a: "", b: "", open: false });
  }
  async function logout() { await supabase.auth.signOut(); router.replace("/auth"); }

  return (
    <Shell profile={profile} active="profil">
      <section className="m-card nopad">
        <div className="m-prof-head"><span>Profil Saya</span></div>
        <div className="m-prof-body">
          <div className="m-avatar">{(profile.full_name || "P").charAt(0).toUpperCase()}</div>
          <h2 className="center">{profile.full_name}</h2>
          <p className="center muted">{profile.email}</p>
          {msg && <div className={`notice ${msg.ok ? "success" : ""}`}>{msg.text}</div>}
          <div className="m-field"><small>NAMA</small>
            <div className="m-inline"><input className="plain-input" value={name} onChange={e => setName(e.target.value)} />
              <button className="m-btn sm" onClick={saveName}><Pencil size={15} /> Simpan</button></div></div>
          <div className="m-field"><small>UID</small><code>{profile.id}</code></div>
          <div className="m-field"><small>EMAIL</small><b>{profile.email}</b></div>
          <div className="m-field"><small>NOMOR {profile.ewallet_method || "E-WALLET"}</small><code>{profile.ewallet_number || "Belum diatur"}</code></div>
          <div className="m-field"><small>ROLE</small><b>{profile.role === "admin" ? "Admin" : "User"}</b></div>
          <div className="m-field"><small>TANGGAL GABUNG</small><b>{dateTime(profile.created_at)}</b></div>
        </div>
      </section>

      <section className="m-card">
        <h2 className="m-h2 flex"><Trophy size={20} /> Statistik Total</h2>
        <div className="m-grid2">
          <div className="m-num"><b className="blue">{stat.total}</b><small>Total Tugas</small></div>
          <div className="m-num"><b className="green">{stat.approved}</b><small>Diterima</small></div>
          <div className="m-num"><b className="red">{stat.rejected}</b><small>Ditolak</small></div>
          <div className="m-num"><b className="amber">{stat.pending}</b><small>Pending</small></div>
        </div>
      </section>

      <section className="m-card">
        <h2 className="m-h2 flex"><KeyRound size={20} /> Keamanan Akun</h2>
        {!pw.open ? (
          <button className="m-list-btn" onClick={() => setPw({ ...pw, open: true })}><KeyRound size={18} /> Buat / Ubah Kata Sandi <ChevronRight size={16} /></button>
        ) : (
          <div className="form">
            <input className="plain-input" type="password" placeholder="Minimal 8 karakter" value={pw.a} onChange={e => setPw({ ...pw, a: e.target.value })} />
            <input className="plain-input" type="password" placeholder="Konfirmasi kata sandi" value={pw.b} onChange={e => setPw({ ...pw, b: e.target.value })} />
            <button className="m-btn" onClick={savePw}>Simpan</button>
            <button className="m-btn ghost" onClick={() => setPw({ a: "", b: "", open: false })}>Batal</button>
          </div>
        )}
      </section>

      <button className="m-logout" onClick={logout}><LogOut size={19} /> Keluar dari Akun</button>
    </Shell>
  );
}
