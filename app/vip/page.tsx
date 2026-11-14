"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { isVip } from "@/lib/vip";
import Shell, { Loading } from "@/components/Shell";
import { dateTime, rupiah } from "@/lib/format";
import { Crown, TrendingUp, Lock, Download, Clock } from "lucide-react";

type Order = { id: string; amount: number; status: string; sender_note: string | null; created_at: string };
const ORDER_LABEL: Record<string, string> = { pending: "Menunggu konfirmasi", approved: "Disetujui", rejected: "Ditolak" };

export default function Vip() {
  const { profile, loading, reload } = useProfile();
  const [conf, setConf] = useState({ price: 20000, days: 30, pct: 20 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from("app_settings").select("key,value").in("key", ["vip_price", "vip_days", "vip_bonus_percent"]),
      supabase.from("vip_orders").select("*").eq("user_id", profile.id).order("created_at", { ascending: false })
    ]);
    const m = Object.fromEntries((s || []).map(x => [x.key, x.value]));
    setConf({ price: Number(m.vip_price ?? 20000), days: Number(m.vip_days ?? 30), pct: Number(m.vip_bonus_percent ?? 20) });
    setOrders((o || []) as Order[]);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) return <Loading />;

  const vip = isVip(profile);
  const pending = orders.find(o => o.status === "pending");
  const example = Math.round(10000 * (100 + conf.pct) / 100);

  async function order() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("create_vip_order", { p_note: note.trim() });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Pesanan dibuat. Bayar sesuai nominal di bawah." });
    if (!error) setNote("");
    load(); reload();
  }

  return (
    <Shell profile={profile} active="none">
      <section className="m-banner gold">
        <h1><Crown size={28} /> Akun VIP</h1>
        <p>{vip
          ? <>VIP kamu aktif {profile.vip_until ? <>sampai <b>{dateTime(profile.vip_until)}</b></> : <b>selamanya</b>}.</>
          : "Upgrade untuk rate lebih tinggi dan akses tugas khusus VIP."}</p>
      </section>

      <section className="m-card">
        <h2 className="m-h2">Benefit VIP</h2>
        <div className="m-benefit"><TrendingUp size={22} /><div><b>Rate per tugas naik {conf.pct}%</b><small>Contoh: tugas {rupiah(10000)} menjadi {rupiah(example)}.</small></div></div>
        <div className="m-benefit"><Lock size={22} /><div><b>Akses tugas khusus VIP</b><small>Tugas bertanda VIP hanya bisa dikerjakan akun VIP.</small></div></div>
        <div className="m-benefit"><Clock size={22} /><div><b>Masa aktif {conf.days === 0 ? "selamanya" : `${conf.days} hari`}</b><small>{conf.days === 0 ? "Sekali bayar." : "Bisa diperpanjang dengan membayar lagi."}</small></div></div>
        <p className="muted sm">Kenaikan rate berlaku untuk tugas yang kamu ambil setelah VIP aktif dan disetujui admin. Ketersediaan tugas tidak dijamin.</p>
      </section>

      <section className="m-card">
        <h2 className="m-h2">Upgrade ke VIP · {rupiah(conf.price)}</h2>
        {msg && <div className={`notice ${msg.ok ? "success" : ""}`}>{msg.text}</div>}

        {!pending && (
          <>
            <ol className="m-steps">
              <li>Tekan <b>Buat pesanan</b> untuk mendapat nominal bayar (harga + kode unik).</li>
              <li>Scan QRIS di bawah dan bayar <b>sesuai nominal persis</b>.</li>
              <li>Admin mencocokkan pembayaran, lalu mengaktifkan VIP-mu.</li>
            </ol>
            <input className="plain-input" placeholder="Nama pengirim / catatan (opsional)" value={note} onChange={e => setNote(e.target.value)} maxLength={200} />
            <button className="m-btn" disabled={busy} onClick={order}>{busy ? "Memproses..." : "Buat pesanan"}</button>
          </>
        )}

        {pending && (
          <>
            <div className="m-pay">
              <small>BAYAR TEPAT</small>
              <b>{rupiah(pending.amount)}</b>
              <span>Kode unik sudah termasuk. Jangan dibulatkan.</span>
            </div>
            <div className="m-hero-note dark"><Clock size={15} /> Menunggu konfirmasi admin setelah kamu membayar.</div>
          </>
        )}

        <img src="/qris.png" alt="QRIS pembayaran VIP" className="m-qris" />
        <a className="m-btn ghost" href="/qris.png" download="qris-vip.png"><Download size={18} /> Simpan QRIS</a>
      </section>

      <section className="m-card">
        <h2 className="m-h2">Riwayat pesanan</h2>
        {orders.length === 0 && <p className="center muted">Belum ada pesanan.</p>}
        {orders.map(o => (
          <div key={o.id} className="history-row">
            <div><b>{rupiah(o.amount)}</b><small>{dateTime(o.created_at)}</small></div>
            <span className={`status ${o.status}`}>{ORDER_LABEL[o.status]}</span>
          </div>
        ))}
      </section>
    </Shell>
  );
}
