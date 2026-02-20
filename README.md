# 🕵️ ShadowCheck (X/Twitter Shadowban Tool)

ShadowCheck is a clean, minimalist open-source web application designed to help X (formerly Twitter) users quickly verify if their accounts are facing unnotified visibility penalties such as Search Bans, Search Suggestion Bans, or Ghost Bans. 

Check out the live demo here: **[shadowbanchecker.pages.dev](https://shadowbanchecker.pages.dev)**

---

## ✨ Features

- **Tiga Lapis Analisis Shadowban**:
  - **Search Suggestion Ban**: Mengecek apakah akun Anda dihapus dari index *autocomplete* pencarian publik.
  - **Search Ban**: Mengecek apakah *tweets* Anda disembunyikan secara paksa dari hasil *Search*.
  - **Ghost Ban**: Mendeteksi penalti *reply deboosting*, di mana balasan Anda selalu diletakkan paling bawah di bawah batasan *show more replies*.
- **Anti Spam & Rate Limiting**: Memiliki *cooldown* antarmuka bawaan (5 detik) untuk mencegah eksploitasi dan limitasi API pihak ketiga secara tidak sengaja.
- **Export to Image (Save PNG)**: Memudahkan pengguna untuk membagikan status *health check* akun mereka ke publik secara visual dengan 1 kali klik.
- **Persistent Global Visitor Counter**: Sistem penghitung pengunjung (*hit counter*) global bawaan di bagian footer untuk memonitor aktivitas lalu lintas web.
- **Dark Mode Support**: Terintegrasi penuh dengan sistem *Light/Dark Theme* secara estetis dengan *custom scrollbar*.
- **CORS Image Fallback**: Menangani proteksi pemuatan Avatar pada *Privacy Browser* (seperti Brave / UBlock) dengan baik tanpa merusak antarmuka. Anda tetap dapat mengunduh PNG tanpa terkena kendala *Tainted Canvas*.
- **Tips & FAQ Modal**: Tersedia *pop-up* terintegrasi yang menjelaskan cara menghindari *shadowban* beserta mitigasinya.



---
*Developed as an Open Source utility.* 
*(Not officially affiliated with X Corp).*

