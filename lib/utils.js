const path = require('path');
const fs = require('fs-extra');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
fs.ensureDirSync(TEMP_DIR);

/**
 * Bersihkan file temporary yang sudah lama
 */
function cleanTemp(maxAge = 300000) {
    try {
        const files = fs.readdirSync(TEMP_DIR);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);
            try {
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
}

/**
 * Hapus file dengan aman
 */
async function safeDelete(filePath) {
    try {
        if (filePath && await fs.pathExists(filePath)) {
            await fs.unlink(filePath);
        }
    } catch (e) { /* ignore */ }
}

/**
 * Format ukuran file
 */
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format durasi detik ke mm:ss
 */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Escape special characters untuk shell command
 */
function escapeShell(str) {
    return str.replace(/(["\s'$`\\])/g, '\\$1');
}

module.exports = {
    TEMP_DIR,
    cleanTemp,
    safeDelete,
    formatSize,
    formatDuration,
    escapeShell
};
