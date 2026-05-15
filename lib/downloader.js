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
 * Download media dari URL menggunakan yt-dlp
 */
async function downloadMedia(url, options = {}) {
    const { audioOnly = false } = options;

    await fs.ensureDir(TEMP_DIR);

    const id = crypto.randomBytes(8).toString('hex');
    const ext = audioOnly ? 'mp3' : 'mp4';
    const filePath = path.join(TEMP_DIR, `${id}.${ext}`);

    try {
        const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
        
        let args = [
            `"${url}"`,
            '-o', `"${filePath}"`,
            '--no-playlist',
            '--no-warnings'
        ];

        if (fs.existsSync(cookiesPath)) {
            args.push('--cookies', `"${cookiesPath}"`);
        } else {
            args.push('--extractor-args', '"youtube:player_client=android"');
        }

        if (audioOnly) {
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '128K');
        } else {
            args.push('-f', '"best[filesize<50M]/best"');
        }

        const cmd = `yt-dlp ${args.join(' ')}`;

        return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            exec(cmd, { timeout: 120000 }, async (err, stdout, stderr) => {
                if (err) {
                    if (stderr && stderr.includes('Sign in to confirm')) {
                        return reject(new Error('YouTube memblokir server Google Cloud.\n\n⚠️ *SOLUSI WAJIB:*\n1. Download ekstensi "Get cookies.txt LOCALLY" di Chrome komputer.\n2. Buka youtube.com & export cookies.txt\n3. Kirim file cookies.txt tersebut ke bot ini dengan caption *.setcookies*'));
                    }
                    return reject(new Error('Download gagal. Pastikan URL valid dan video tidak private.'));
                }
                try {
                    const stat = await fs.stat(filePath);
                    resolve({
                        path: filePath,
                        filename: `${id}.${ext}`,
                        size: stat.size,
                        title: 'Download Berhasil', // Title akan diambil dari pesan bot sebelumnya (searchYouTube)
                        duration: 0
                    });
                } catch (e) {
                    reject(new Error('Error membaca file download.'));
                }
            });
        });
    } catch (err) {
        throw new Error('Download gagal sistem error.');
    }
}

module.exports = {
    checkFfmpeg,
    getMediaInfo,
    searchYouTube,
    downloadMedia
};
