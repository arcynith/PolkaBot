const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const yts = require('yt-search');
const { yta, ytv } = require('api-dylux');
const axios = require('axios');
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
        const r = await yts({ videoId: new URL(url).searchParams.get('v') || url.split('/').pop() });
        return {
            title: r.title,
            duration: r.seconds,
            thumbnail: r.thumbnail
        };
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
 * Download media dari URL menggunakan api-dylux
 */
async function downloadMedia(url, options = {}) {
    const { audioOnly = false } = options;

    await fs.ensureDir(TEMP_DIR);

    const id = crypto.randomBytes(8).toString('hex');
    const ext = audioOnly ? 'mp3' : 'mp4';
    const filePath = path.join(TEMP_DIR, `${id}.${ext}`);

    try {
        // Ambil data download dari API
        const data = audioOnly ? await yta(url) : await ytv(url);
        
        if (!data || !data.dl_url) {
            throw new Error('Gagal mendapatkan link download dari server.');
        }

        // Download file
        const response = await axios({
            method: 'GET',
            url: data.dl_url,
            responseType: 'stream'
        });

        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(filePath);
            response.data.pipe(writeStream);

            writeStream.on('finish', async () => {
                try {
                    const stat = await fs.stat(filePath);
                    resolve({
                        path: filePath,
                        filename: `${id}.${ext}`,
                        size: stat.size,
                        title: data.title || 'Unknown',
                        duration: 0
                    });
                } catch (e) {
                    reject(new Error('Error membaca file download.'));
                }
            });

            writeStream.on('error', () => {
                reject(new Error('Gagal menyimpan file download.'));
            });
        });
    } catch (err) {
        throw new Error('Download gagal. Pastikan URL valid dan server sedang tidak sibuk.');
    }
}

module.exports = {
    checkFfmpeg,
    getMediaInfo,
    searchYouTube,
    downloadMedia
};
