const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

/**
 * Buat sticker dari message yang berisi media
 */
async function handleSticker(sock, msg) {
    const sender = msg.key.remoteJid;
    const reply = async (text) => sock.sendMessage(sender, { text }, { quoted: msg });

    // Cek apakah pesan berisi media (image/video) atau me-reply media
    const messageType = Object.keys(msg.message || {})[0];
    let isMedia = messageType === 'imageMessage' || messageType === 'videoMessage';
    
    let targetMessage = msg;
    let targetType = messageType;

    // Jika reply
    if (messageType === 'extendedTextMessage') {
        const quotedMsg = msg.message.extendedTextMessage.contextInfo?.quotedMessage;
        if (quotedMsg) {
            const quotedType = Object.keys(quotedMsg)[0];
            if (quotedType === 'imageMessage' || quotedType === 'videoMessage') {
                isMedia = true;
                targetMessage = { message: quotedMsg };
                targetType = quotedType;
            }
        }
    }

    if (!isMedia) {
        return reply('❌ Kirim atau reply gambar/video dengan caption *.s*');
    }

    try {
        await reply('⏳ Sedang membuat sticker...');

        // Download media menggunakan Baileys
        const buffer = await downloadMediaMessage(
            targetMessage,
            'buffer',
            {},
            { 
                logger: require('pino')({ level: 'silent' }),
                reuploadRequest: sock.updateMediaMessage
            }
        );

        // Buat sticker menggunakan wa-sticker-formatter
        const sticker = new Sticker(buffer, {
            pack: config.botName || 'PolkaBot',
            author: config.stickerAuthor || 'PolkaBot',
            type: StickerTypes.FULL,
            quality: 70
        });

        const stickerBuffer = await sticker.toBuffer();

        // Kirim sticker
        await sock.sendMessage(sender, { sticker: stickerBuffer }, { quoted: msg });

    } catch (err) {
        console.error('[STICKER ERROR]', err.message);
        await reply('❌ Gagal membuat sticker. Pastikan file tidak terlalu besar atau korup.');
    }
}

/**
 * Konversi sticker ke gambar
 */
async function handleToImg(sock, msg) {
    const sender = msg.key.remoteJid;
    const reply = async (text) => sock.sendMessage(sender, { text }, { quoted: msg });

    const messageType = Object.keys(msg.message || {})[0];
    let isSticker = false;
    let targetMessage = null;

    if (messageType === 'extendedTextMessage') {
        const quotedMsg = msg.message.extendedTextMessage.contextInfo?.quotedMessage;
        if (quotedMsg && quotedMsg.stickerMessage) {
            isSticker = true;
            targetMessage = { message: quotedMsg };
        }
    }

    if (!isSticker) {
        return reply('❌ Reply *sticker* dengan caption *.toimg*');
    }

    try {
        await reply('⏳ Sedang memproses...');

        // Download sticker
        const buffer = await downloadMediaMessage(
            targetMessage,
            'buffer',
            {},
            { 
                logger: require('pino')({ level: 'silent' }),
                reuploadRequest: sock.updateMediaMessage
            }
        );

        // Kirim ulang sebagai image
        await sock.sendMessage(sender, { image: buffer }, { quoted: msg });

    } catch (err) {
        console.error('[TOIMG ERROR]', err.message);
        await reply('❌ Gagal mengkonversi sticker ke gambar.');
    }
}

module.exports = { handleSticker, handleToImg };
