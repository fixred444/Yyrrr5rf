"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BRAND, BRAND_A, BRAND_B } from "@/lib/brand";
import { Mail, LockKeyhole, UserRound, Eye, EyeOff, ArrowRight, Sparkles, Gift } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [ref, setRef] = useState("");

  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("ref");
      if (r) { setRef(r.toUpperCase()); setMode("signup"); localStorage.setItem("th_ref", r.toUpperCase()); }
    } catch { /* abaikan */ }
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
    try {
      if (mode === "signup") {
        if (name.trim().length < 3) throw new Error("Nama minimal 3 karakter.");
        try { if (ref.trim()) localStorage.setItem("th_ref", ref.trim().toUpperCase()); } catch { /* abaikan */ }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim(), ref_code: ref.trim().toUpperCase() }, emailRedirectTo: `${window.location.origin}/auth` }
        });
        if (error) throw error;
        if (data.session) { router.replace("/dashboard"); router.refresh(); }
        else { setSuccess(true); setMessage("Pendaftaran berhasil. Periksa email untuk konfirmasi, lalu masuk."); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (!data.user) throw new Error("Login gagal. Silakan coba kembali.");
        router.replace("/dashboard"); router.refresh();
      }
    } catch (err: unknown) {
      setSuccess(false); setMessage(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally { setBusy(false); }
  }

  async function googleLogin() {
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
      if (error) throw error;
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Login Google gagal."); setBusy(false);
    }
  }

  return <main className="auth-shell"><div className="auth-glow" /><section className="auth-wrap">
    <div className="brand"><div className="brand-icon"><Mail size={25} /></div><span>{BRAND_A} <b>{BRAND_B}</b></span></div>
    <div className="auth-card">
      <div className="eyebrow"><Sparkles size={15} /> RUANG KERJA DIGITAL</div>
      <h1>{mode === "login" ? "Selamat datang kembali" : "Buat akun baru"}</h1>
      <p className="muted">{mode === "login" ? "Masuk untuk melihat tugas dan aktivitas akun kamu." : "Daftar untuk bergabung dan melihat tugas yang tersedia."}</p>
      <div className="switcher">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Masuk</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>Daftar</button>
      </div>
      <button type="button" className="google-button" onClick={googleLogin} disabled={busy}><span className="google-logo">G</span> Lanjutkan dengan Google</button>
      <div className="divider"><span />atau<span /></div>
      <form onSubmit={submit} className="form">
        {mode === "signup" && <label>Nama lengkap<div className="input"><UserRound size={19} /><input type="text" placeholder="Nama lengkap kamu" value={name} onChange={e => setName(e.target.value)} required minLength={3} /></div></label>}
        {mode === "signup" && <label>Kode referral <span className="muted">(opsional)</span><div className="input"><Gift size={19} /><input type="text" placeholder="KODE DARI TEMAN" value={ref} onChange={e => setRef(e.target.value.toUpperCase())} maxLength={12} /></div></label>}
        <label>Email<div className="input"><Mail size={19} /><input type="email" placeholder="anda@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div></label>
        <label>Password<div className="input"><LockKeyhole size={19} /><input type={showPassword ? "text" : "password"} placeholder="Minimal 6 karakter" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
        {message && <div className={success ? "notice success" : "notice"} role="status">{message}</div>}
        <button type="submit" className="primary full" disabled={busy}>{busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar sekarang"}{!busy && <ArrowRight size={19} />}</button>
      </form>
      <p className="fineprint">Gunakan akun milik sendiri. Jangan pernah membagikan password atau kode OTP kepada siapa pun.</p>
    </div>
    <p className="copyright">© 2026 {BRAND}<br />Ruang kerja digital.</p>
  </section></main>;
}
