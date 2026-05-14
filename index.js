const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./lib/handler');
const { checkYtDlp, checkFfmpeg } = require('./lib/downloader');
const { cleanTemp } = require('./lib/utils');
const config = require('./config');

// ═══════════════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════════════
console.log(`
╔═══════════════════════════════════════╗
║         🤖 POLKABOT v1.0.0           ║
║   WhatsApp Bot - Sticker & Media     ║
║   Prefix: ${config.prefix}                            ║
╚═══════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════
// CEK DEPENDENCIES
// ═══════════════════════════════════════════════════
async function checkDependencies() {
    console.log('[SETUP] Mengecek dependencies...');

    const hasYtDlp = await checkYtDlp();
    const hasFfmpeg = await checkFfmpeg();

    if (!hasYtDlp) {
        console.warn('[WARNING] yt-dlp tidak terdeteksi!');
        console.warn('  → Install: pip install yt-dlp');
        console.warn('  → Atau download dari: https://github.com/yt-dlp/yt-dlp/releases');
        console.warn('  → Fitur download media sosial tidak akan berfungsi tanpa yt-dlp.');
    } else {
        console.log('[OK] yt-dlp terdeteksi ✓');
    }

    if (!hasFfmpeg) {
        console.warn('[WARNING] ffmpeg tidak terdeteksi!');
        console.warn('  → Install: https://ffmpeg.org/download.html');
        console.warn('  → Fitur sticker video tidak akan berfungsi tanpa ffmpeg.');
    } else {
        console.log('[OK] ffmpeg terdeteksi ✓');
    }

    return { hasYtDlp, hasFfmpeg };
}

// ═══════════════════════════════════════════════════
// INISIALISASI CLIENT
// ═══════════════════════════════════════════════════
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu'
        ]
    }
});

// ═══════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════

// QR Code untuk login
client.on('qr', (qr) => {
    console.log('\n[LOGIN] Scan QR Code di bawah ini dengan WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('[LOGIN] Buka WhatsApp → Menu → Linked Devices → Link a Device\n');
});

// Autentikasi berhasil
client.on('authenticated', () => {
    console.log('[AUTH] Autentikasi berhasil! ✓');
});

// Gagal autentikasi
client.on('auth_failure', (msg) => {
    console.error('[AUTH] Autentikasi gagal:', msg);
    console.error('[AUTH] Hapus folder .wwebjs_auth dan coba lagi.');
});

// Client siap
client.on('ready', () => {
    console.log(`
╔═══════════════════════════════════════╗
║       ✅ BOT SIAP DIGUNAKAN!         ║
║   Kirim .menu untuk melihat fitur    ║
╚═══════════════════════════════════════╝
    `);
});

// Terputus
client.on('disconnected', (reason) => {
    console.log('[DISCONNECT] Bot terputus:', reason);
    console.log('[DISCONNECT] Mencoba reconnect...');
    client.initialize();
});

// Handler pesan masuk
client.on('message', async (message) => {
    await handleMessage(client, message);
});

// Handler pesan masuk dari group juga
client.on('message_create', async (message) => {
    // Hanya proses pesan dari orang lain (bukan dari bot sendiri)
    if (message.fromMe) return;
    // message event sudah handle ini, skip duplikat
});

// ═══════════════════════════════════════════════════
// AUTO CLEANUP TEMP FILES
// ═══════════════════════════════════════════════════
setInterval(() => {
    cleanTemp(config.tempCleanupInterval);
}, config.tempCleanupInterval);

// ═══════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════
process.on('SIGINT', async () => {
    console.log('\n[SHUTDOWN] Menutup bot...');
    await client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    console.error('[ERROR] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[ERROR] Uncaught exception:', err);
});

// ═══════════════════════════════════════════════════
// START BOT
// ═══════════════════════════════════════════════════
async function start() {
    await checkDependencies();
    console.log('\n[INIT] Menginisialisasi bot... (ini mungkin butuh waktu)\n');
    client.initialize();
}

start();
