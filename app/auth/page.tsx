 "use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Mail, LockKeyhole, UserRound, Sparkles } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Pendaftaran berhasil. Periksa email untuk konfirmasi, lalu masuk.");
        } else router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) { setMessage(err.message || "Terjadi kesalahan."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <div className="auth-glow"/>
    <section className="auth-wrap">
      <div className="brand"><div className="brand-icon"><Mail size={25}/></div><span>S3L <b>ZERO99</b></span></div>
      <div className="auth-card">
        <div className="eyebrow"><Sparkles size={15}/> RUANG KERJA DIGITAL</div>
        <h1>{mode === "login" ? "Selamat datang kembali" : "Buat akun baru"}</h1>
        <p className="muted">Masuk untuk melihat tugas dan aktivitas akun kamu.</p>
        <div className="switcher">
          <button className={mode==="login"?"active":""} onClick={()=>{setMode("login");setMessage("");}}>Masuk</button>
          <button className={mode==="signup"?"active":""} onClick={()=>{setMode("signup");setMessage("");}}>Daftar</button>
        </div>
        <form onSubmit={submit} className="form">
          {mode==="signup" && <label>Nama lengkap<div className="input"><UserRound size={18}/><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nama kamu"/></div></label>}
          <label>Email<div className="input"><Mail size={18}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></div></label>
          <label>Password<div className="input"><LockKeyhole size={18}/><input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/></div></label>
          {message && <div className="notice">{message}</div>}
          <button className="primary full" disabled={busy}>{busy?"Memproses...":mode==="login"?"Masuk ke akun":"Daftar sekarang"}</button>
        </form>
        <p className="fineprint">Dengan melanjutkan, kamu setuju menggunakan platform untuk tugas yang sah. Jangan pernah membagikan password atau kode OTP akun pribadi.</p>
      </div>
      <p className="copyright">© 2026 S3L ZERO99</p>
    </section>
  </main>;
}
