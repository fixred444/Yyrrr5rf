"use client";

import Link from "next/link";
import { useProfile } from "@/lib/useProfile";
import Shell, { Loading } from "@/components/Shell";
import { ArrowLeft, ShieldCheck, ScrollText } from "lucide-react";

export default function Aturan() {
  const { profile, loading } = useProfile();
  if (loading || !profile) return <Loading />;
  return (
    <Shell profile={profile} active="none">
      <Link href="/dashboard" className="m-back"><ArrowLeft size={18} /> Kembali</Link>
      <section className="m-banner purple">
        <div className="m-hero-label"><ShieldCheck size={15} /> WAJIB DIBACA</div>
        <h1><ScrollText size={30} /> Rules &amp; Ketentuan</h1>
        <p>Baca aturan berikut sebelum mengerjakan tugas. Pelanggaran dapat menyebabkan tugas ditolak atau akun diblokir.</p>
      </section>
      <section className="m-card rules">
        <ol>
          <li>Kerjakan tugas sesuai instruksi yang ditulis admin.</li>
          <li>Satu tugas hanya bisa dikerjakan oleh satu pengguna. Siapa yang menekan &quot;Sudah Dikerjakan&quot; lebih dulu, dialah yang mendapat tugas tersebut.</li>
          <li>Jangan menandai tugas yang belum benar-benar kamu kerjakan.</li>
          <li>Gunakan data dan akun milik sendiri. Dilarang memakai data palsu atau akun orang lain.</li>
          <li>Jangan pernah membagikan password, kode OTP, atau kode pemulihan kepada siapa pun, termasuk admin.</li>
          <li>Jika tugas ditolak, tugas dibuka kembali untuk pengguna lain.</li>
          <li>Penarikan saldo minimal Rp1.000 dan diproses manual oleh admin.</li>
        </ol>
        <p className="muted sm">Wajib mematuhi semua aturan yang berlaku. Pelanggaran dapat menyebabkan akun diblokir.</p>
      </section>
    </Shell>
  );
}
