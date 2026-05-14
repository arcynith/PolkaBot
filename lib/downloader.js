const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const { TEMP_DIR } = require('./utils');
const config = require('../config');

/**
 * Cek apakah ffmpeg tersedia di system
 */
async function checkFfmpeg() {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec('ffmpeg -version', { timeout: 10000 }, (err) => {
            resolve(!err);
        });
    });
}

/**
 * Dapatkan info media (fallback search YouTube)
 */
async function getMediaInfo(url) {
    try {
        if (ytdl.validateURL(url)) {
            const info = await ytdl.getInfo(url);
            return {
                title: info.videoDetails.title,
                duration: parseInt(info.videoDetails.lengthSeconds),
                thumbnail: info.videoDetails.thumbnails[0]?.url || null
            };
        }
        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Search YouTube dan return hasil pertama menggunakan yt-search
 */
async function searchYouTube(query) {
    try {
        const r = await yts(query);
        const videos = r.videos.slice(0, 1); // Ambil hasil pertama
        if (videos.length === 0) {
            throw new Error('Hasil tidak ditemukan.');
        }
        
        return {
            title: videos[0].title,
            url: videos[0].url,
            duration: videos[0].seconds
        };
    } catch (err) {
        throw new Error('Pencarian gagal. Coba lagi.');
    }
}

/**
 * Download media dari URL menggunakan @distube/ytdl-core
 */
async function downloadMedia(url, options = {}) {
    const { audioOnly = false } = options;

    await fs.ensureDir(TEMP_DIR);

    const id = crypto.randomBytes(8).toString('hex');
    const ext = audioOnly ? 'mp3' : 'mp4';
    const filePath = path.join(TEMP_DIR, `${id}.${ext}`);

    try {
        if (!ytdl.validateURL(url)) {
            throw new Error('URL tidak valid atau tidak didukung.');
        }

        const info = await getMediaInfo(url);
        
        return new Promise((resolve, reject) => {
            const stream = ytdl(url, {
                filter: audioOnly ? 'audioonly' : 'audioandvideo',
                quality: audioOnly ? 'highestaudio' : 'highest'
            });

            const writeStream = fs.createWriteStream(filePath);

            stream.pipe(writeStream);

            stream.on('error', (err) => {
                reject(new Error('Download gagal. Pastikan URL valid dan video tidak private.'));
            });

            writeStream.on('finish', async () => {
                try {
                    const stat = await fs.stat(filePath);
                    resolve({
                        path: filePath,
                        filename: `${id}.${ext}`,
                        size: stat.size,
                        title: info?.title || 'Unknown',
                        duration: info?.duration || 0
                    });
                } catch (e) {
                    reject(new Error('Error membaca file download.'));
                }
            });
        });
    } catch (err) {
        throw err;
    }
}

module.exports = {
    checkFfmpeg,
    getMediaInfo,
    searchYouTube,
    downloadMedia
};
