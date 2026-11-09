# S3L ZERO99 — Task Platform V3

Aplikasi Next.js + Supabase untuk autentikasi, daftar tugas, pengajuan pengguna, panel admin, dan saldo berbasis persetujuan.

## Fitur
- Daftar dan login email/password melalui Supabase Auth.
- Profil otomatis dibuat saat pendaftaran.
- Dashboard pengguna; daftar tugas kosong sampai admin menerbitkan tugas.
- Pengguna dapat mengajukan satu kali untuk setiap tugas.
- Panel admin untuk membuat/nonaktifkan tugas dan menyetujui/menolak pengajuan.
- Persetujuan menambahkan saldo dan transaksi secara atomik melalui RPC database.
- Row Level Security (RLS) membatasi akses berdasarkan akun dan peran.

## 1. Buat proyek Supabase
1. Buat proyek di https://supabase.com.
2. Buka SQL Editor.
3. Salin seluruh isi `supabase/schema.sql`, lalu jalankan.
4. Buka Project Settings > API, salin Project URL dan `anon` public key.

## 2. Atur environment
1. Duplikat `.env.example` menjadi `.env.local`.
2. Isi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Jangan pernah memasukkan `service_role` key ke frontend, GitHub, atau variabel `NEXT_PUBLIC_*`.

## 3. Jalankan lokal
```bash
npm install
npm run dev
```
Buka http://localhost:3000.

## 4. Buat admin pertama
1. Daftar akun biasa melalui `/auth`.
2. Di Supabase, buka Authentication > Users, salin UUID akun.
3. Jalankan SQL berikut di SQL Editor (ganti UUID):
```sql
update public.profiles
set role = 'admin'
where id = 'UUID_ADMIN_DI_SINI';
```
4. Logout lalu login kembali. Tombol Panel Admin akan muncul di dashboard. Panel juga bisa dibuka di `/admin`.

Jangan memberi role admin kepada akun yang tidak dipercaya.

## 5. Deploy ke Vercel
1. Push seluruh folder ini ke repository GitHub.
2. Di Vercel, Import Project dari repository tersebut.
3. Tambahkan dua Environment Variables yang sama dengan `.env.local`.
4. Deploy. Jika mengubah environment variable, lakukan redeploy.
5. Di Supabase > Authentication > URL Configuration, atur Site URL ke domain Vercel dan tambahkan URL redirect yang diperlukan.

## Catatan penting
- Tugas awal sengaja kosong. Tugas baru hanya muncul setelah admin membuatnya.
- Ini adalah fondasi aplikasi tugas umum. Gunakan hanya untuk pekerjaan yang sah dan transparan.
- Jangan meminta password, OTP, recovery code, atau data sensitif akun pihak ketiga.
- Jangan gunakan platform untuk jual-beli akun, pembuatan akun massal, spam, atau mengakali verifikasi layanan.
- Saldo dalam aplikasi adalah pencatatan internal, bukan integrasi pembayaran atau penarikan dana. Fitur pencairan perlu rancangan dan verifikasi terpisah.
- Untuk produksi, aktifkan konfirmasi email, CAPTCHA/rate limit, kebijakan privasi, syarat layanan, audit log, dan validasi bukti tugas.
