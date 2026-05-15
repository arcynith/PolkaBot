const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { handleMessage } = require('./lib/handler');
const { checkFfmpeg } = require('./lib/downloader');
const { cleanTemp } = require('./lib/utils');
const config = require('./config');

// ═══════════════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════════════
console.log(`
╔═══════════════════════════════════════╗
║         🤖 POLKABOT v2.0.0           ║
║   WhatsApp Bot - Sticker & Media     ║
║   Powered by Baileys                 ║
║   Prefix: ${config.prefix}                            ║
╚═══════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════
// CEK DEPENDENCIES
// ═══════════════════════════════════════════════════
async function checkDependencies() {
    console.log('[SETUP] Mengecek dependencies...');
    const hasFfmpeg = await checkFfmpeg();

    if (!hasFfmpeg) {
        console.warn('[WARNING] ffmpeg tidak terdeteksi!');
        console.warn('  → Fitur sticker video tidak akan berfungsi tanpa ffmpeg.');
    } else {
        console.log('[OK] ffmpeg terdeteksi ✓');
    }
}

// ═══════════════════════════════════════════════════
// INISIALISASI CLIENT BAILEYS
// ═══════════════════════════════════════════════════
async function startBot() {
    await checkDependencies();
    console.log('\n[INIT] Menginisialisasi bot Baileys...\n');

    const { state, saveCreds } = await useMultiFileAuthState('./.baileys_auth');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[INFO] Menggunakan WA v${version.join('.')} (isLatest: ${isLatest})`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['PolkaBot', 'Chrome', '1.0.0'],
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            const qrcode = require('qrcode-terminal');
            qrcode.generate(qr, { small: true });
            console.log('\n[SCAN QR] Silakan buka WhatsApp -> Linked Devices -> Scan QR Code di atas!\n');
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[DISCONNECT] Koneksi terputus. Alasan:', lastDisconnect.error?.message);
            if (shouldReconnect) {
                console.log('[DISCONNECT] Mencoba reconnect...');
                startBot();
            } else {
                console.log('[DISCONNECT] Telah logout dari WhatsApp. Hapus folder .baileys_auth dan jalankan ulang untuk scan QR baru.');
            }
        } else if (connection === 'open') {
            console.log(`
╔═══════════════════════════════════════╗
║       ✅ BOT SIAP DIGUNAKAN!         ║
║   Kirim .menu untuk melihat fitur    ║
╚═══════════════════════════════════════╝
            `);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        
        // Cek pesan apakah valid dan dari orang lain
        if (!msg.message || msg.key.fromMe) return;

        // Abaikan pesan lama (lebih dari 60 detik) agar tidak memproses antrean lama saat bot baru nyala
        const now = Math.floor(Date.now() / 1000);
        if (now - msg.messageTimestamp > 60) return;

        try {
            await handleMessage(sock, msg);
        } catch (err) {
            console.error('[ERROR] Error handling message:', err);
        }
    });

    return sock;
}

// ═══════════════════════════════════════════════════
// AUTO CLEANUP TEMP FILES
// ═══════════════════════════════════════════════════
setInterval(() => {
    cleanTemp(config.tempCleanupInterval);
}, config.tempCleanupInterval);

// ═══════════════════════════════════════════════════
// START BOT
// ═══════════════════════════════════════════════════
startBot();
