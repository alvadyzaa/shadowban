# 📝 Changelog

All notable changes to the ShadowCheck project will be documented in this file.

## [1.2.0] - 2026-02-23

### ✨ Added (Fitur Baru)

- **Other Tools Menu**: Menu baru "Tools" (ikon wrench 🔧) di header navigation. Popup modal berisi daftar tools:
  - **AestheticGen** — Generate aesthetic usernames & display names (`aestheticgen.pages.dev`)
  - **X-Hunter** — Brainstorming ideas & content strategy (`x-hunter.pages.dev`)
- **Support / Traktir Kopi ☕**: Tombol baru "Support" (ikon hati ❤️) di header dengan popup modal berisi QR code donasi.
- **Visibility Deep Scan**: Fitur "Forensic Audit" di-rebrand menjadi "Visibility Deep Scan" dengan bahasa yang lebih profesional.
- **SVG Lucide Icons**: Ikon emoji di hasil Deep Scan diganti dengan ikon SVG dari Lucide (Search, MessageCircle, Bell, Eye) untuk tampilan lebih konsisten.

### 🔧 Changed (Perubahan)

- **Header Navigation Redesign**: Semua menu di header diubah menjadi pill-style button dengan subtle drop shadow. Mobile responsive — di layar kecil hanya tampil ikon, teks disembunyikan.
- **Follow @miegrains → 𝕏 Keith**: Link Twitter di header diganti dari "Follow @miegrains" menjadi ikon X/Twitter + "Keith".
- **Display Name vs Username**: Nama tampilan (display name) sekarang diambil dari field `name` API vxtwitter, bukan `screen_name`. Contoh: tampil "Keith." (display name) dengan "@miegrains" (username) di bawahnya.
- **Visitor Counter Stabilized**: Counter sekarang menggunakan `sessionStorage` — hanya increment 1x per session browser. Tidak naik-naik lagi setiap refresh halaman.
- **Accounts Checked Synced**: Angka "accounts checked" di hero dan "Visitor" di footer sekarang sinkron (satu sumber data yang sama).
- **"Not affiliated with X Corp"**: Dipindahkan dari footer ke dalam menu About modal.
- **Footer Simplified**: Footer sekarang hanya menampilkan `© 2026 ShadowCheck by Keith. • Visitor: X`.
- **Audit Language Cleanup**: Bahasa Indonesia di log Deep Scan diperbaiki — kata "menambang" dihapus, diganti terminologi yang lebih tepat.
- **Thread Links**: Link hasil Deep Scan sekarang mengarah ke URL pencarian/notifikasi yang relevan, bukan hanya profil user.

### 🐛 Fixed (Perbaikan Bug)

- **Save Image Export Fixed**: Tombol "Save Image" yang sebelumnya gagal (gambar kosong/error) sekarang berfungsi. Gambar cross-origin (avatar dari `unavatar.io`/`pbs.twimg.com`) dikonversi ke inline base64 data URL sebelum di-render ke canvas oleh `html-to-image`.
- **Avatar Fallback Chain**: Avatar sekarang punya fallback chain: `pbs.twimg.com` → `unavatar.io/twitter/{username}` → inisial huruf. Tidak akan pernah blank/broken lagi.
- **Verified Badge Accuracy**: Badge verified tidak lagi muncul secara salah. Hanya tampil jika API benar-benar mengembalikan status verified (tidak ada lagi fallback `>= 5000 followers`).

### 🗑️ Removed (Dihapus)

- **Risk Factors Detected**: Section "⚠️ Risk Factors Detected" dihapus total dari StatusCard karena data yang ditampilkan bersifat statis dan tidak akurat.
- **Verified Heuristics Fallback**: Logika `followersCount >= 5000` untuk menebak status verified dihapus. Badge hanya berdasarkan data API asli.

---

## [1.1.0] - 2026-02-21

### ✨ Added (Fitur Baru)

- **Menu Tips & FAQ**: Modal interaktif baru yang menjelaskan durasi, penyebab, dan cara menghindari Shadowban Twitter.
- **Global Visitor Tracker**: Penghitung traffic bawaan di footer yang terintegrasi dengan backend _Cloudflare Serverless_ untuk menyimpan angka kunjungan secara global tanpa mengandalkan `localStorage`.
- **Anti-Spam Cooldown (Rate Limiting)**: Menambahkan jeda waktu pintar 5 detik (dengan _countdown visual_) di form utama dan menu _Recent Checks_ untuk melindungi limitasi API publik dari eksploitasi beruntun.
- **Verified Status Heuristics**: Mengaktifkan fallback logika pintar (+5000 Followers) untuk mendeteksi profil "Biru" bilamana data API publik gagal memberikan status berlangganan aslinya.
- **Custom Aesthetic Scrollbar**: Tampilan antarmuka _scroll_ di menu Tips kini jauh lebih minimalis dan disesuaikan secara otomatis baik untuk mode Terang maupun Gelap (_Dark Mode_).

### 🐛 Fixed (Perbaikan Bug)

- **Avatar CORS Fix (AdBlocker Proof)**: Gambar profil Avatar yang sering rusak (_broken image_) pada browser berbasis Privasi (seperti _Brave_) atau ketika mode _AdBlocker_ aktif telah diselesaikan. Avatar kini dialihkan sepenuhnya melalui _Base64 Cloudflare Worker Proxy_ dan akan memiliki _fallback_ otomatis (menjadi inisial Abjad) jika data terputus. Hal ini juga menyelesaikan masalah _Tainted Canvas_ yang membuat hasil unduhan gambar (Export PNG) kosong di masa lalu.
- **Visitor Tracker AdBlocker Fix**: Pengguna dengan tingkat keamanan ketat sering terhambat memuat angka Visitor karena URL _tracking_ pihak ketiga yang diblokir otomatis. Proses fetch Visitor API kini dibungkus (_wrapped_) secara aman di atas URL Cloudflare milik pengguna sendiri (`/api/visitor`).
- **Layout Alignment**: Merapikan posisi antar-tombol navigasi di _Header_ supaya sejajar sempurna tanpa padding yang asimetris.
- **Scroll Lag**: Mengembalikan performa tinggi efek modal dengan menghilangan filter CSS berat `backdrop-blur-sm` yang menyebabkan antarmuka patah-patah (_lag_) di perangkat selular rendah.
