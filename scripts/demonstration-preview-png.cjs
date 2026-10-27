// Minimal PNG pixel reader for catalog evidence: 8-bit RGB/RGBA, non-interlaced (what Chromium screenshots produce).
// It exists so the capture and the catalog validator can check that a surface capture is a real render, not a
// blank or placeholder frame, without adding an image dependency.
const zlib = require('node:zlib');
const assert = require('node:assert/strict');

const SIGNATURE = '89504e470d0a1a0a';

function decodePng(png) {
    assert.equal(png.toString('hex', 0, 8), SIGNATURE, 'Not a PNG');
    let offset = 8;
    let header = null;
    const idat = [];
    while (offset < png.length) {
        const length = png.readUInt32BE(offset);
        const type = png.toString('ascii', offset + 4, offset + 8);
        const body = png.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') header = {width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], colorType: body[9], interlace: body[12]};
        else if (type === 'IDAT') idat.push(body);
        else if (type === 'IEND') break;
        offset += 12 + length;
    }
    assert.ok(header, 'PNG has no IHDR');
    assert.equal(header.depth, 8, 'Only 8-bit PNG pixels are supported');
    assert.equal(header.interlace, 0, 'Interlaced PNG pixels are not supported');
    const channels = {2: 3, 6: 4}[header.colorType];
    assert.ok(channels, `Unsupported PNG colour type ${header.colorType}`);
    const stride = header.width * channels;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    assert.equal(raw.length, (stride + 1) * header.height, 'PNG pixel data has the wrong length');
    const data = Buffer.alloc(stride * header.height);
    for (let y = 0; y < header.height; y++) {
        const filter = raw[y * (stride + 1)];
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        const out = data.subarray(y * stride, (y + 1) * stride);
        const above = y ? data.subarray((y - 1) * stride, y * stride) : null;
        for (let x = 0; x < stride; x++) {
            const left = x >= channels ? out[x - channels] : 0;
            const up = above ? above[x] : 0;
            const upLeft = above && x >= channels ? above[x - channels] : 0;
            let predictor = 0;
            if (filter === 1) predictor = left;
            else if (filter === 2) predictor = up;
            else if (filter === 3) predictor = (left + up) >> 1;
            else if (filter === 4) {
                const p = left + up - upLeft;
                const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
                predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
            } else assert.ok(filter === 0, `Unsupported PNG filter ${filter}`);
            out[x] = (line[x] + predictor) & 255;
        }
    }
    return {width: header.width, height: header.height, channels, data};
}

/** Distinct colours and the share of the most common one: a blank, single-colour or placeholder frame scores low/high. */
function pixelStats(png) {
    const {width, height, channels, data} = decodePng(png);
    const counts = new Map();
    for (let i = 0; i < data.length; i += channels) {
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    const total = width * height;
    return {distinctColors: counts.size, dominantColorShare: Math.round(Math.max(...counts.values()) / total * 1e6) / 1e6};
}

// A real render has antialiased edges, shading and several line colours; these bounds reject blank and flat frames.
const MIN_DISTINCT_COLORS = 64;
const MAX_DOMINANT_SHARE = 0.995;

function assertNonUniformPixels(png, label) {
    const stats = pixelStats(png);
    assert.ok(stats.distinctColors >= MIN_DISTINCT_COLORS && stats.dominantColorShare <= MAX_DOMINANT_SHARE,
        `${label} looks blank or placeholder: ${JSON.stringify(stats)}`);
    return stats;
}

module.exports = {decodePng, pixelStats, assertNonUniformPixels, MIN_DISTINCT_COLORS, MAX_DOMINANT_SHARE};
