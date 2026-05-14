const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { TEMP_DIR } = require('./utils');
const config = require('../config');

/**
 * Cek apakah yt-dlp tersedia di system
 */
async function checkYtDlp() {
    return new Promise((resolve) => {
        exec('yt-dlp --version', { timeout: 10000 }, (err, stdout) => {
            if (err) {
                resolve(false);
            } else {
                console.log(`[INFO] yt-dlp version: ${stdout.trim()}`);
                resolve(true);
            }
        });
    });
}

/**
 * Cek apakah ffmpeg tersedia di system
 */
async function checkFfmpeg() {
    return new Promise((resolve) => {
        exec('ffmpeg -version', { timeout: 10000 }, (err) => {
            resolve(!err);
        });
    });
}

/**
 * Dapatkan info media tanpa download
 */
async function getMediaInfo(url) {
    return new Promise((resolve) => {
        const cmd = `yt-dlp --no-download --print title --print duration --print thumbnail "${url}"`;
        exec(cmd, { timeout: 30000 }, (err, stdout) => {
            if (err) return resolve(null);
            const lines = stdout.trim().split('\n');
            resolve({
                title: lines[0] || 'Unknown',
                duration: parseInt(lines[1]) || 0,
                thumbnail: lines[2] || null
            });
        });
    });
}

/**
 * Search YouTube dan return hasil pertama
 */
async function searchYouTube(query) {
    return new Promise((resolve, reject) => {
        // Escape double quotes in query
        const safeQuery = query.replace(/"/g, '');
        
        let cmd = `yt-dlp "ytsearch1:${safeQuery}" --print title --print webpage_url --print duration --no-download --no-warnings`;
        
        // Tambahkan cookies jika file cookies.txt tersedia
        const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
        if (fs.existsSync(cookiesPath)) {
            cmd += ` --cookies "${cookiesPath}"`;
        } else {
            cmd += ` --extractor-args "youtube:player_client=android"`; // Fallback
        }

        exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error('Pencarian gagal. Coba lagi.'));
            }
            const lines = stdout.trim().split('\n');
            if (lines.length < 2) {
                return reject(new Error('Hasil tidak ditemukan.'));
            }
            resolve({
                title: lines[0],
                url: lines[1],
                duration: parseInt(lines[2]) || 0
            });
        });
    });
}

/**
 * Download media dari URL menggunakan yt-dlp
 * Mendukung: YouTube, TikTok, Instagram, Facebook, Twitter, Pinterest, dll.
 */
async function downloadMedia(url, options = {}) {
    const {
        audioOnly = false,
        quality = 'best'
    } = options;

    await fs.ensureDir(TEMP_DIR);

    const id = crypto.randomBytes(8).toString('hex');
    const outputTemplate = path.join(TEMP_DIR, `${id}.%(ext)s`);

    // Build yt-dlp command
    let args = [
        `"${url}"`,
        '-o', `"${outputTemplate}"`,
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--max-filesize', `${config.maxFileSize}M`,
        '--socket-timeout', '30'
    ];
    
    // Tambahkan cookies jika tersedia
    const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
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

    // Dapatkan info terlebih dahulu
    const info = await getMediaInfo(url);

    return new Promise((resolve, reject) => {
        exec(cmd, {
            timeout: config.downloadTimeout,
            maxBuffer: 1024 * 1024 * 10
        }, async (err, stdout, stderr) => {
            if (err) {
                const errMsg = stderr || err.message;
                if (errMsg.includes('File is larger')) {
                    return reject(new Error('File terlalu besar (max 50MB).'));
                }
                if (errMsg.includes('Unsupported URL') || errMsg.includes('not a valid URL')) {
                    return reject(new Error('URL tidak valid atau tidak didukung.'));
                }
                if (errMsg.includes('Video unavailable') || errMsg.includes('Private video')) {
                    return reject(new Error('Video tidak tersedia atau private.'));
                }
                return reject(new Error('Download gagal. Pastikan URL valid.'));
            }

            try {
                const files = await fs.readdir(TEMP_DIR);
                const file = files.find(f => f.startsWith(id));

                if (!file) {
                    return reject(new Error('File hasil download tidak ditemukan.'));
                }

                const filePath = path.join(TEMP_DIR, file);
                const stat = await fs.stat(filePath);

                resolve({
                    path: filePath,
                    filename: file,
                    size: stat.size,
                    title: info?.title || 'Unknown',
                    duration: info?.duration || 0
                });
            } catch (e) {
                reject(new Error('Error membaca file download.'));
            }
        });
    });
}

module.exports = {
    checkYtDlp,
    checkFfmpeg,
    getMediaInfo,
    searchYouTube,
    downloadMedia
};
