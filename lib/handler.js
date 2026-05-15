const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const config = require('../config');
const { handleSticker, handleToImg } = require('./sticker');
const { downloadMedia, searchYouTube } = require('./downloader');
const { getMenu } = require('./menu');
const { safeDelete, formatSize, formatDuration } = require('./utils');

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

/**
 * Helper untuk mendapatkan text dari pesan Baileys
 */
function getMessageBody(msg) {
    if (!msg.message) return '';
    let m = msg.message;
    if (m.ephemeralMessage) m = m.ephemeralMessage.message;
    if (m.viewOnceMessage) m = m.viewOnceMessage.message;
    if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;

    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    if (m.documentWithCaptionMessage?.message?.documentMessage?.caption) return m.documentWithCaptionMessage.message.documentMessage.caption;
    if (m.documentMessage?.caption) return m.documentMessage.caption;
    return '';
}

/**
 * Handler utama untuk semua pesan masuk
 */
async function handleMessage(sock, msg) {
    try {
        const body = getMessageBody(msg) || '';
        const prefix = config.prefix;

        // Abaikan jika bukan command
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = args.join(' ');
        
        const sender = msg.key.remoteJid;

        console.log(`[CMD] ${command} | Args: ${text || '-'} | From: ${sender}`);

        // Helper fungsi reply
        const reply = async (text) => {
            return sock.sendMessage(sender, { text }, { quoted: msg });
        };

        switch (command) {
            // ═══════════════════════════════
            // UTILITAS
            // ═══════════════════════════════
            case 'menu':
            case 'help':
                await reply(getMenu());
                break;

            case 'ping':
                await reply('🏓 *Pong!*\nBot aktif dan siap digunakan.');
                break;

            case 'setcookies':
                try {
                    const docMsg = msg.message?.documentMessage || msg.message?.documentWithCaptionMessage?.message?.documentMessage;
                    if (!docMsg) {
                        return reply('❌ Kirim file `cookies.txt` sebagai *Dokumen* dengan caption *.setcookies*');
                    }
                    if (docMsg.fileName !== 'cookies.txt') {
                        return reply('❌ Nama file harus tepat *cookies.txt*');
                    }

                    await reply('⏳ Menyimpan cookies dari WhatsApp...');
                    const buffer = await downloadMediaMessage(
                        msg,
                        'buffer',
                        { },
                        { 
                            logger: sock.logger,
                            reuploadRequest: sock.updateMediaMessage
                        }
                    );
                    
                    const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
                    await fs.writeFile(cookiesPath, buffer);
                    
                    await reply('✅ File cookies.txt berhasil disimpan di server! YouTube seharusnya tidak memblokir lagi.\nSilakan coba perintah `.play` sekarang.');
                } catch (err) {
                    console.error('[SETCOOKIES ERROR]', err);
                    await reply('❌ Gagal menyimpan cookies.');
                }
                break;

            // ═══════════════════════════════
            // STICKER
            // ═══════════════════════════════
            case 'sticker':
            case 's':
                await handleSticker(sock, msg);
                break;

            case 'toimg':
                await handleToImg(sock, msg);
                break;

            // ═══════════════════════════════
            // MUSIK & VIDEO YOUTUBE
            // ═══════════════════════════════
            case 'play':
            case 'musik':
                await handlePlay(sock, msg, text, reply);
                break;

            case 'ytmp3':
                await handleYtMp3(sock, msg, text, reply);
                break;

            case 'ytmp4':
            case 'video':
                await handleYtMp4(sock, msg, text, reply);
                break;

            // ═══════════════════════════════
            // SOCIAL MEDIA DOWNLOADER
            // ═══════════════════════════════
            case 'tiktok':
            case 'tt':
                await handleSocialDownload(sock, msg, text, 'TikTok', reply);
                break;

            case 'ig':
            case 'instagram':
                await handleSocialDownload(sock, msg, text, 'Instagram', reply);
                break;

            case 'fb':
            case 'facebook':
                await handleSocialDownload(sock, msg, text, 'Facebook', reply);
                break;

            case 'twitter':
            case 'tw':
            case 'x':
                await handleSocialDownload(sock, msg, text, 'Twitter/X', reply);
                break;

            case 'pin':
            case 'pinterest':
                await handleSocialDownload(sock, msg, text, 'Pinterest', reply);
                break;

            case 'threads':
                await handleSocialDownload(sock, msg, text, 'Threads', reply);
                break;

            case 'snack':
            case 'snackvideo':
                await handleSocialDownload(sock, msg, text, 'Snack Video', reply);
                break;

            default:
                // Command tidak dikenali, abaikan saja
                break;
        }
    } catch (err) {
        console.error('[HANDLER ERROR]', err.message);
        try {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Terjadi kesalahan. Coba lagi nanti.' }, { quoted: msg });
        } catch (e) { /* ignore reply error */ }
    }
}

// ═══════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════

async function handlePlay(sock, msg, query, reply) {
    if (!query) return reply('❌ Masukkan judul lagu!\n📝 Contoh: *.play Dewa 19 Kangen*');

    let filePath = null;
    try {
        await reply('🔍 Mencari lagu: *' + query + '*...');

        const result = await searchYouTube(query);
        await reply(
            `🎵 *Ditemukan!*\n📌 *Judul:* ${result.title}\n⏱️ *Durasi:* ${formatDuration(result.duration)}\n\n⏳ Sedang mendownload audio...`
        );

        const downloaded = await downloadMedia(result.url, { audioOnly: true });
        filePath = downloaded.path;

        await sendMediaFile(sock, msg, filePath, `🎵 *${result.title}*\n⏱️ ${formatDuration(result.duration)} | 📦 ${formatSize(downloaded.size)}`);
    } catch (err) {
        console.error('[PLAY ERROR]', err.message);
        await reply('❌ ' + (err.message || 'Gagal mendownload lagu.'));
    } finally {
        await safeDelete(filePath);
    }
}

async function handleYtMp3(sock, msg, url, reply) {
    if (!url || !isValidUrl(url)) return reply('❌ URL tidak valid!\n📝 Contoh: *.ytmp3 https://youtu.be/xxx*');

    let filePath = null;
    try {
        await reply('⏳ Sedang mendownload audio...');
        const downloaded = await downloadMedia(url, { audioOnly: true });
        filePath = downloaded.path;
        await sendMediaFile(sock, msg, filePath, `🎵 *${downloaded.title}*\n⏱️ ${formatDuration(downloaded.duration)} | 📦 ${formatSize(downloaded.size)}`);
    } catch (err) {
        console.error('[YTMP3 ERROR]', err.message);
        await reply('❌ ' + (err.message || 'Gagal mendownload audio.'));
    } finally {
        await safeDelete(filePath);
    }
}

async function handleYtMp4(sock, msg, url, reply) {
    if (!url || !isValidUrl(url)) return reply('❌ URL tidak valid!\n📝 Contoh: *.ytmp4 https://youtu.be/xxx*');

    let filePath = null;
    try {
        await reply('⏳ Sedang mendownload video...');
        const downloaded = await downloadMedia(url, { audioOnly: false });
        filePath = downloaded.path;
        await sendMediaFile(sock, msg, filePath, `🎬 *${downloaded.title}*\n⏱️ ${formatDuration(downloaded.duration)} | 📦 ${formatSize(downloaded.size)}`);
    } catch (err) {
        console.error('[YTMP4 ERROR]', err.message);
        await reply('❌ ' + (err.message || 'Gagal mendownload video.'));
    } finally {
        await safeDelete(filePath);
    }
}

async function handleSocialDownload(sock, msg, url, platform, reply) {
    if (!url || !isValidUrl(url)) return reply(`❌ URL tidak valid!\n📝 Contoh: *.${platform.toLowerCase().replace(/[^a-z]/g, '')} <url>*`);

    let filePath = null;
    try {
        await reply(`⏳ Sedang mendownload dari *${platform}*...`);
        const downloaded = await downloadMedia(url, { audioOnly: false });
        filePath = downloaded.path;
        await sendMediaFile(sock, msg, filePath, `📱 *${platform}*\n📌 ${downloaded.title}\n📦 ${formatSize(downloaded.size)}`);
    } catch (err) {
        console.error(`[${platform.toUpperCase()} ERROR]`, err.message);
        await reply('❌ ' + (err.message || `Gagal mendownload dari ${platform}.`));
    } finally {
        await safeDelete(filePath);
    }
}

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

async function sendMediaFile(sock, msg, filePath, caption = '') {
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const filename = path.basename(filePath);
    const jid = msg.key.remoteJid;

    const stat = await fs.stat(filePath);
    const isLargeFile = stat.size > 15 * 1024 * 1024; // > 15MB

    const content = { url: filePath };

    if (isLargeFile) {
        await sock.sendMessage(jid, { document: content, mimetype: mimeType, fileName: filename, caption }, { quoted: msg });
    } else if (mimeType.startsWith('video/')) {
        await sock.sendMessage(jid, { video: content, mimetype: mimeType, caption }, { quoted: msg });
    } else if (mimeType.startsWith('image/')) {
        await sock.sendMessage(jid, { image: content, mimetype: mimeType, caption }, { quoted: msg });
    } else if (mimeType.startsWith('audio/')) {
        await sock.sendMessage(jid, { audio: content, mimetype: mimeType }, { quoted: msg });
    } else {
        await sock.sendMessage(jid, { document: content, mimetype: mimeType, fileName: filename, caption }, { quoted: msg });
    }
}

function isValidUrl(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

module.exports = { handleMessage };
