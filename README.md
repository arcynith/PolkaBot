# 🤖 PolkaBot - WhatsApp Bot

Bot WhatsApp multifungsi: Sticker Maker & Media Downloader dari semua platform sosial media.

## 📋 Fitur

| Command | Fungsi |
|---------|--------|
| `.menu` | Tampilkan menu |
| `.ping` | Cek bot aktif |
| `.sticker` / `.s` | Buat sticker dari gambar/video |
| `.toimg` | Konversi sticker ke gambar |
| `.play <judul>` | Cari & download musik YouTube |
| `.ytmp3 <url>` | Download audio YouTube |
| `.ytmp4 <url>` | Download video YouTube |
| `.tiktok <url>` | Download video TikTok |
| `.ig <url>` | Download dari Instagram |
| `.fb <url>` | Download dari Facebook |
| `.twitter <url>` | Download dari Twitter/X |
| `.pin <url>` | Download dari Pinterest |
| `.threads <url>` | Download dari Threads |
| `.snack <url>` | Download dari Snack Video |

## ⚙️ Persyaratan

1. **Node.js** v18 atau lebih baru → [Download](https://nodejs.org/)
2. **yt-dlp** → Untuk download media sosial
   ```
   pip install yt-dlp
   ```
   Atau download binary dari [GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases)
3. **FFmpeg** → Untuk sticker video/animasi
   - Download dari [ffmpeg.org](https://ffmpeg.org/download.html)
   - Pastikan `ffmpeg` ada di PATH system

## 🚀 Instalasi & Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Jalankan bot
npm start
```

Saat pertama kali dijalankan:
1. QR Code akan muncul di terminal
2. Buka **WhatsApp** di HP
3. Masuk ke **Menu → Linked Devices → Link a Device**
4. Scan QR Code
5. Bot siap digunakan! ✅

## 📁 Struktur Project

```
PolkaBot/
├── index.js           # Entry point
├── config.js          # Konfigurasi bot
├── package.json       # Dependencies
├── lib/
│   ├── handler.js     # Command router
│   ├── sticker.js     # Sticker tools
│   ├── downloader.js  # Media downloader (yt-dlp)
│   ├── menu.js        # Menu display
│   └── utils.js       # Helper functions
├── temp/              # File temporary (auto-managed)
└── .wwebjs_auth/      # Session WhatsApp (auto-generated)
```

## ⚠️ Troubleshooting

- **QR tidak muncul?** → Hapus folder `.wwebjs_auth` lalu jalankan ulang
- **Sticker gagal?** → Pastikan FFmpeg terinstall dan ada di PATH
- **Download gagal?** → Pastikan yt-dlp terinstall dan terupdate (`yt-dlp -U`)
- **Error Puppeteer?** → Jalankan `npm install puppeteer` ulang
