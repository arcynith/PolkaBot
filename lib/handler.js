const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const config = require('../config');
const { handleSticker, handleToImg } = require('./sticker');
const { downloadMedia, searchYouTube } = require('./downloader');
const { getMenu } = require('./menu');
const { safeDelete, formatSize, formatDuration } = require('./utils');

/**
 * Handler utama untuk semua pesan masuk
 */
async function handleMessage(client, message) {
    try {
        const body = message.body || '';
        const prefix = config.prefix;

        // Abaikan jika bukan command
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = args.join(' ');

        console.log(`[CMD] ${command} | Args: ${text || '-'} | From: ${message.from}`);

        switch (command) {
            // ═══════════════════════════════
            // UTILITAS
            // ═══════════════════════════════
            case 'menu':
            case 'help':
                await message.reply(getMenu());
                break;

            case 'ping':
                await message.reply('🏓 *Pong!*\nBot aktif dan siap digunakan.');
                break;

            // ═══════════════════════════════
            // STICKER
            // ═══════════════════════════════
            case 'sticker':
            case 's':
                await handleSticker(client, message);
                break;

            case 'toimg':
                await handleToImg(client, message);
                break;

            // ═══════════════════════════════
            // MUSIK & VIDEO YOUTUBE
            // ═══════════════════════════════
            case 'play':
            case 'musik':
                await handlePlay(message, text);
                break;

            case 'ytmp3':
                await handleYtMp3(message, text);
                break;

            case 'ytmp4':
            case 'video':
                await handleYtMp4(message, text);
                break;

            // ═══════════════════════════════
            // SOCIAL MEDIA DOWNLOADER
            // ═══════════════════════════════
            case 'tiktok':
            case 'tt':
                await handleSocialDownload(message, text, 'TikTok');
                break;

            case 'ig':
            case 'instagram':
                await handleSocialDownload(message, text, 'Instagram');
                break;

            case 'fb':
            case 'facebook':
                await handleSocialDownload(message, text, 'Facebook');
                break;

            case 'twitter':
            case 'tw':
            case 'x':
                await handleSocialDownload(message, text, 'Twitter/X');
                break;

            case 'pin':
            case 'pinterest':
                await handleSocialDownload(message, text, 'Pinterest');
                break;

            case 'threads':
                await handleSocialDownload(message, text, 'Threads');
                break;

            case 'snack':
            case 'snackvideo':
                await handleSocialDownload(message, text, 'Snack Video');
                break;

            default:
                // Command tidak dikenali, abaikan saja
                break;
        }
    } catch (err) {
        console.error('[HANDLER ERROR]', err.message);
        try {
            await message.reply('❌ Terjadi kesalahan. Coba lagi nanti.');
        } catch (e) { /* ignore reply error */ }
    }
}

// ═══════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * .play <judul> - Cari & download musik dari YouTube
 */
async function handlePlay(message, query) {
    if (!query) {
        return message.reply('❌ Masukkan judul lagu!\n📝 Contoh: *.play Dewa 19 Kangen*');
    }

    let filePath = null;
    try {
        await message.reply('🔍 Mencari lagu: *' + query + '*...');

        // Search YouTube
        const result = await searchYouTube(query);
        await message.reply(
            `🎵 *Ditemukan!*\n` +
            `📌 *Judul:* ${result.title}\n` +
            `⏱️ *Durasi:* ${formatDuration(result.duration)}\n\n` +
            `⏳ Sedang mendownload audio...`
        );

        // Download audio
        const downloaded = await downloadMedia(result.url, { audioOnly: true });
        filePath = downloaded.path;

        // Kirim audio
        await sendMediaFile(message, filePath, `🎵 *${result.title}*\n⏱️ ${formatDuration(result.duration)} | 📦 ${formatSize(downloaded.size)}`);

    } catch (err) {
        console.error('[PLAY ERROR]', err.message);
        await message.reply('❌ ' + (err.message || 'Gagal mendownload lagu.'));
    } finally {
        await safeDelete(filePath);
    }
}

/**
 * .ytmp3 <url> - Download audio dari YouTube
 */
async function handleYtMp3(message, url) {
    if (!url) {
        return message.reply('❌ Masukkan URL YouTube!\n📝 Contoh: *.ytmp3 https://youtu.be/xxx*');
    }

    if (!isValidUrl(url)) {
        return message.reply('❌ URL tidak valid!');
    }

    let filePath = null;
    try {
        await message.reply('⏳ Sedang mendownload audio...');

        const downloaded = await downloadMedia(url, { audioOnly: true });
        filePath = downloaded.path;

        await sendMediaFile(message, filePath, `🎵 *${downloaded.title}*\n⏱️ ${formatDuration(downloaded.duration)} | 📦 ${formatSize(downloaded.size)}`);

    } catch (err) {
        console.error('[YTMP3 ERROR]', err.message);
        await message.reply('❌ ' + (err.message || 'Gagal mendownload audio.'));
    } finally {
        await safeDelete(filePath);
    }
}

/**
 * .ytmp4 <url> - Download video dari YouTube
 */
async function handleYtMp4(message, url) {
    if (!url) {
        return message.reply('❌ Masukkan URL YouTube!\n📝 Contoh: *.ytmp4 https://youtu.be/xxx*');
    }

    if (!isValidUrl(url)) {
        return message.reply('❌ URL tidak valid!');
    }

    let filePath = null;
    try {
        await message.reply('⏳ Sedang mendownload video...');

        const downloaded = await downloadMedia(url, { audioOnly: false });
        filePath = downloaded.path;

        await sendMediaFile(message, filePath, `🎬 *${downloaded.title}*\n⏱️ ${formatDuration(downloaded.duration)} | 📦 ${formatSize(downloaded.size)}`);

    } catch (err) {
        console.error('[YTMP4 ERROR]', err.message);
        await message.reply('❌ ' + (err.message || 'Gagal mendownload video.'));
    } finally {
        await safeDelete(filePath);
    }
}

/**
 * Universal social media downloader
 * Mendukung: TikTok, Instagram, Facebook, Twitter/X, Pinterest, Threads, Snack Video
 */
async function handleSocialDownload(message, url, platform) {
    if (!url) {
        return message.reply(`❌ Masukkan URL ${platform}!\n📝 Contoh: *.${platform.toLowerCase().replace(/[^a-z]/g, '')} <url>*`);
    }

    if (!isValidUrl(url)) {
        return message.reply('❌ URL tidak valid!');
    }

    let filePath = null;
    try {
        await message.reply(`⏳ Sedang mendownload dari *${platform}*...`);

        const downloaded = await downloadMedia(url, { audioOnly: false });
        filePath = downloaded.path;

        await sendMediaFile(message, filePath, `📱 *${platform}*\n📌 ${downloaded.title}\n📦 ${formatSize(downloaded.size)}`);

    } catch (err) {
        console.error(`[${platform.toUpperCase()} ERROR]`, err.message);
        await message.reply('❌ ' + (err.message || `Gagal mendownload dari ${platform}.`));
    } finally {
        await safeDelete(filePath);
    }
}

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Kirim file media ke chat
 */
async function sendMediaFile(message, filePath, caption = '') {
    const data = await fs.readFile(filePath);
    const base64 = data.toString('base64');
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const filename = path.basename(filePath);

    const media = new MessageMedia(mimeType, base64, filename);

    // Untuk file besar, kirim sebagai document
    const stat = await fs.stat(filePath);
    const isLargeFile = stat.size > 15 * 1024 * 1024; // > 15MB

    if (isLargeFile) {
        await message.reply(media, undefined, {
            caption,
            sendMediaAsDocument: true
        });
    } else {
        await message.reply(media, undefined, { caption });
    }
}

/**
 * Validasi URL sederhana
 */
function isValidUrl(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

module.exports = { handleMessage };
