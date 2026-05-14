const config = require('../config');

function getMenu() {
    const p = config.prefix;
    return `
╔══════════════════════════════╗
║       🤖 *POLKABOT v1.0*       ║
║  _Sticker & Media Downloader_  ║
╚══════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━
📌 *STICKER TOOLS*
━━━━━━━━━━━━━━━━━━━━━━
│ ${p}sticker / ${p}s
│  ↳ _Buat sticker dari gambar/video_
│  ↳ _Kirim/reply gambar dengan ${p}s_
│
│ ${p}toimg
│  ↳ _Konversi sticker ke gambar_
│  ↳ _Reply sticker dengan ${p}toimg_

━━━━━━━━━━━━━━━━━━━━━━
🎵 *MUSIK & VIDEO*
━━━━━━━━━━━━━━━━━━━━━━
│ ${p}play <judul>
│  ↳ _Cari & download musik YouTube_
│
│ ${p}ytmp3 <url>
│  ↳ _Download audio YouTube_
│
│ ${p}ytmp4 <url>
│  ↳ _Download video YouTube_

━━━━━━━━━━━━━━━━━━━━━━
📱 *SOCIAL MEDIA DOWNLOADER*
━━━━━━━━━━━━━━━━━━━━━━
│ ${p}tiktok <url>
│  ↳ _Download video TikTok_
│
│ ${p}ig <url>
│  ↳ _Download dari Instagram_
│
│ ${p}fb <url>
│  ↳ _Download dari Facebook_
│
│ ${p}twitter <url>
│  ↳ _Download dari Twitter/X_
│
│ ${p}pin <url>
│  ↳ _Download dari Pinterest_
│
│ ${p}threads <url>
│  ↳ _Download dari Threads_
│
│ ${p}snack <url>
│  ↳ _Download dari Snack Video_

━━━━━━━━━━━━━━━━━━━━━━
📋 *UTILITAS*
━━━━━━━━━━━━━━━━━━━━━━
│ ${p}menu → _Tampilkan menu ini_
│ ${p}ping → _Cek bot aktif_

━━━━━━━━━━━━━━━━━━━━━━
_Prefix: ${p} (titik)_
_Powered by PolkaBot 🚀_
`.trim();
}

module.exports = { getMenu };
