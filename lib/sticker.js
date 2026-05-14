const sharp = require('sharp');
const { MessageMedia } = require('whatsapp-web.js');
const config = require('../config');

/**
 * Buat sticker dari message yang berisi media
 * @param {import('whatsapp-web.js').Client} client
 * @param {import('whatsapp-web.js').Message} message
 */
async function handleSticker(client, message) {
    let media = null;

    // Cek apakah message punya media (gambar/video dikirim dengan caption .s)
    if (message.hasMedia) {
        media = await message.downloadMedia();
    }
    // Cek apakah reply ke message yang punya media
    else if (message.hasQuotedMsg) {
        const quoted = await message.getQuotedMessage();
        if (quoted.hasMedia) {
            media = await quoted.downloadMedia();
        }
    }

    if (!media) {
        await message.reply('❌ Kirim atau reply gambar/video dengan caption *.s*');
        return;
    }

    // Validasi tipe media
    const isImage = media.mimetype.startsWith('image/');
    const isVideo = media.mimetype.startsWith('video/');

    if (!isImage && !isVideo) {
        await message.reply('❌ Media harus berupa gambar atau video!');
        return;
    }

    try {
        await message.reply('⏳ Sedang membuat sticker...');

        const chat = await message.getChat();
        await chat.sendMessage(media, {
            sendMediaAsSticker: true,
            stickerName: config.botName,
            stickerAuthor: config.stickerAuthor
        });
    } catch (err) {
        console.error('[STICKER ERROR]', err.message);
        await message.reply('❌ Gagal membuat sticker. Pastikan file tidak terlalu besar.');
    }
}

/**
 * Konversi sticker ke gambar
 * @param {import('whatsapp-web.js').Client} client
 * @param {import('whatsapp-web.js').Message} message
 */
async function handleToImg(client, message) {
    if (!message.hasQuotedMsg) {
        await message.reply('❌ Reply sticker dengan caption *.toimg*');
        return;
    }

    const quoted = await message.getQuotedMessage();

    if (quoted.type !== 'sticker') {
        await message.reply('❌ Reply *sticker* dengan caption *.toimg*');
        return;
    }

    try {
        const media = await quoted.downloadMedia();
        const buffer = Buffer.from(media.data, 'base64');

        // Konversi WebP ke PNG menggunakan sharp
        const pngBuffer = await sharp(buffer).png().toBuffer();
        const base64 = pngBuffer.toString('base64');

        const imgMedia = new MessageMedia('image/png', base64, 'sticker.png');
        await message.reply(imgMedia);
    } catch (err) {
        console.error('[TOIMG ERROR]', err.message);
        await message.reply('❌ Gagal mengkonversi sticker ke gambar.');
    }
}

module.exports = { handleSticker, handleToImg };
