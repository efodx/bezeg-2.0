'use strict';
/*
 * Writes src/analysis/epicycleOutlines.ts. Usage: node scripts/epicycle-outlines/generate.cjs <ne_10m_admin_0_countries.geojson>
 * See README.md. Deterministic: the same input gives the same file. Not run by the app or the tests.
 */
const fs = require('fs');
const path = require('path');
const {catPolyline} = require('./cat-path.cjs');

const HALF_EXTENT = 2.5;
const COUNTS = {slovenia: 200, cat: 160, blossom: 200};

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const signedArea = (pts) => pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length];
    return s + (p[0] * q[1] - q[0] * p[1]);
}, 0) / 2;

/** Drops consecutive duplicates (and a closing duplicate of the first point). */
function clean(pts) {
    const out = [];
    for (const p of pts) if (!out.length || dist(out[out.length - 1], p) > 1e-12) out.push(p);
    while (out.length > 1 && dist(out[0], out[out.length - 1]) <= 1e-12) out.pop();
    return out;
}

/**
 * n points on the closed polyline, first by arc length, then relaxed along the polyline until all consecutive chords are equal
 * (each point moves along the path to be as far from its predecessor as from its successor). Equal chords are what the model's
 * evenness check measures; a plain arc-length resampling shortens the chords at corners such as the ears of the cat.
 */
function resampleEvenChords(poly, n) {
    const m = poly.length;
    const cumulative = [0];
    for (let i = 0; i < m; i++) cumulative.push(cumulative[i] + dist(poly[i], poly[(i + 1) % m]));
    const total = cumulative[m];
    const pointAt = (position) => {
        let t = position % total;
        if (t < 0) t += total;
        let lo = 0;
        let hi = m;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (cumulative[mid] <= t) lo = mid; else hi = mid;
        }
        const span = cumulative[lo + 1] - cumulative[lo];
        const u = span > 0 ? (t - cumulative[lo]) / span : 0;
        const p = poly[lo];
        const q = poly[(lo + 1) % m];
        return [p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1])];
    };
    const s = Array.from({length: n}, (_, i) => (total * i) / n);
    const at = (i) => (i < 0 ? s[i + n] - total : i >= n ? s[i - n] + total : s[i]);
    const pts = s.map(pointAt);
    const pointOf = (i) => pts[((i % n) + n) % n];
    for (let sweep = 0; sweep < 8000; sweep++) {
        let moved = 0;
        for (let i = 0; i < n; i++) {
            const prev = pointOf(i - 1);
            const next = pointOf(i + 1);
            let lo = at(i - 1);
            let hi = at(i + 1);
            for (let k = 0; k < 45; k++) {
                const mid = (lo + hi) / 2;
                const p = pointAt(mid);
                if (dist(p, prev) < dist(p, next)) lo = mid; else hi = mid;
            }
            const next_s = (lo + hi) / 2;
            moved = Math.max(moved, Math.abs(next_s - s[i]));
            s[i] = next_s;
            pts[i] = pointAt(next_s);
        }
        if (moved < 1e-12 * total) break;
    }
    const chords = pts.map((p, i) => dist(p, pts[(i + 1) % n]));
    const mean = chords.reduce((x, y) => x + y, 0) / n;
    const spread = Math.max(...chords.map((c) => Math.abs(c - mean) / mean));
    if (spread > 0.002) throw new Error(`chords are not even after relaxation (spread ${spread})`);
    return pts;
}

/** Centres on the bounding box, scales to HALF_EXTENT, makes the loop counterclockwise, rounds to 3 decimals. */
function fit(pts) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
    const scale = HALF_EXTENT / half;
    let out = pts.map((p) => [(p[0] - cx) * scale, (p[1] - cy) * scale]);
    if (signedArea(out) < 0) out = out.reverse();
    const round = (v) => Math.round(v * 1000) / 1000 + 0;
    return out.map((p) => [round(p[0]), round(p[1])]);
}

function segmentsCross(a, b, c, d) {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

function assertSimple(pts, id) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
            if (i === 0 && j === n - 1) continue;
            if (segmentsCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) throw new Error(`${id}: outline crosses itself near ${i}, ${j}`);
        }
    }
}

function slovenia(geojsonPath) {
    const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    const feature = data.features.find((f) => f.properties.ADMIN === 'Slovenia');
    if (!feature) throw new Error('Slovenia not found in the Natural Earth file');
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const rings = polygons.map((p) => clean(p[0]));
    const ring = rings.reduce((best, r) => (Math.abs(signedAreaLonLat(r)) > Math.abs(signedAreaLonLat(best)) ? r : best));
    const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    return ring.map(([lon, lat]) => [lon * k, lat]);
}

function signedAreaLonLat(r) {
    return signedArea(r);
}

function blossom() {
    const pts = [];
    const samples = 4000;
    for (let i = 0; i < samples; i++) {
        const a = (2 * Math.PI * i) / samples;
        const r = 1 + 0.42 * Math.cos(5 * a) + 0.06 * Math.cos(10 * a);
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return pts;
}

function build(geojsonPath) {
    const raw = {slovenia: slovenia(geojsonPath), cat: catPolyline(), blossom: blossom()};
    const result = {};
    for (const id of Object.keys(COUNTS)) {
        const points = fit(resampleEvenChords(clean(raw[id]), COUNTS[id]));
        assertSimple(points, id);
        result[id] = points;
    }
    return result;
}

const SOURCES = {
    slovenia: 'Natural Earth 1:10m Admin 0 - Countries (public domain, https://www.naturalearthdata.com/), feature ADMIN = "Slovenia", its largest ring; equirectangular projection x = lon cos(lat0) with lat0 the mean latitude of the ring, y = lat; resampled to equal chords, centred, scaled to fit [-2,5; 2,5]. Source file: nvkelso/natural-earth-vector, geojson/ne_10m_admin_0_countries.geojson.',
    cat: 'An original silhouette authored for Bezeg (a sitting cat seen from the front: two pointed ears, round head, tail curled up on the right); the cubic Bezier source is scripts/epicycle-outlines/cat-path.cjs. No font glyph, emoji or third-party image was traced.',
    blossom: 'The polar curve r = 1 + 0.42 cos 5a + 0.06 cos 10a (the elderflower blossom of the design mockup), sampled at 4000 angles; resampled to equal chords, centred, scaled to fit [-2,5; 2,5].',
};

function format(result) {
    const lines = [];
    lines.push('/*');
    lines.push(' * GENERATED by scripts/epicycle-outlines/generate.cjs; do not edit by hand (see scripts/epicycle-outlines/README.md).');
    lines.push(' *');
    lines.push(' * Closed polygons for the epicycles subjects (spec: site-walkthrough-graphs-and-captures, G07). Each is counterclockwise,');
    lines.push(' * resampled to equal chords, centred and scaled to fit [-2,5; 2,5] in both axes, rounded to 3 decimals; the first point is');
    lines.push(' * not repeated at the end and no two consecutive points are equal.');
    lines.push(' */');
    lines.push('');
    lines.push('export interface EpicycleOutlineData {');
    lines.push('    readonly id: string;');
    lines.push('    /** Where the outline comes from (licence included). */');
    lines.push('    readonly source: string;');
    lines.push('    readonly points: readonly (readonly [number, number])[];');
    lines.push('}');
    lines.push('');
    lines.push('export const EPICYCLE_OUTLINE_DATA: Readonly<Record<' + Object.keys(COUNTS).map((id) => "'" + id + "'").join(' | ') + ', EpicycleOutlineData>> = {');
    for (const id of Object.keys(COUNTS)) {
        lines.push(`    ${id}: {`);
        lines.push(`        id: '${id}',`);
        lines.push(`        // ${SOURCES[id]}`);
        lines.push(`        source: ${JSON.stringify(SOURCES[id])},`);
        lines.push(`        // ${result[id].length} points`);
        lines.push('        points: [');
        for (let i = 0; i < result[id].length; i += 6) {
            lines.push(`            ${result[id].slice(i, i + 6).map((p) => `[${p[0]}, ${p[1]}]`).join(', ')},`);
        }
        lines.push('        ],');
        lines.push('    },');
    }
    lines.push('};');
    lines.push('');
    return lines.join('\n');
}

if (require.main === module) {
    const input = process.argv[2];
    if (!input) {
        console.error('usage: node scripts/epicycle-outlines/generate.cjs <ne_10m_admin_0_countries.geojson>');
        process.exit(2);
    }
    const result = build(path.resolve(input));
    const target = path.resolve(__dirname, '../../src/analysis/epicycleOutlines.ts');
    fs.writeFileSync(target, format(result));
    for (const id of Object.keys(result)) console.log(`${id}: ${result[id].length} points`);
}

module.exports = {build, COUNTS};
