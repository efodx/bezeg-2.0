'use strict';
// Jump check for lesson-guided Demonstration clips: a smooth motion has no step between neighbouring frames that is
// far larger than the typical step. Calibration data and the margin are in
// docs/reviews/feature-streams/clips/slice-b-note.md.
const {decodePng} = require('../demonstration-preview-png.cjs');

// Steps are mean absolute RGB differences on a 0-255 scale. A step at or below FLOOR is not motion: it is a held or
// repeated frame, or encoder noise: across 28 decoded catalog clips, 324 of 618 small non-zero steps are below 0.01 and
// the rest thin out smoothly with no gap, so 0.05 is a pragmatic floor, not a measured boundary. It only affects the median.
const FLOOR = 0.05;
// A clip is cut when its largest step exceeds THRESHOLD times the typical (median) moving step. 3 was calibrated on decoded
// catalog frames. Board text is left out of the mean (see frameSteps `ignore`), because a readout that flips, such as
// "Točno nižljiva" to "Ni nižljiva" in reduction, reaches 5.11x on smooth raw frames; all five cuts caught at 3 scored 3.45-5.16,
// so raising the threshold would catch none of them. The state check (assessPathSteps) is the precise cut detector on dense scenes.
const THRESHOLD = 3;
// Ignored pixels may cover at most this share of the frame: a larger mask would hide the picture the check is meant to watch.
const MAX_IGNORED_RATIO = 0.25;

/** Pixel-exact boolean mask (1 = ignored) of the union of rectangles {x, y, width, height} on a width x height frame. */
function ignoreMask(width, height, ignore = []) {
    const mask = new Uint8Array(width * height);
    for (const r of ignore) {
        const x0 = Math.max(0, Math.floor(r.x)), x1 = Math.min(width, Math.ceil(r.x + r.width));
        const y0 = Math.max(0, Math.floor(r.y)), y1 = Math.min(height, Math.ceil(r.y + r.height));
        for (let y = y0; y < y1; y++) mask.fill(1, y * width + x0, y * width + Math.max(x0, x1));
    }
    return mask;
}

/** Share of a width x height frame covered by the union of the rectangles. */
function ignoredRatio(width, height, ignore = []) {
    const mask = ignoreMask(width, height, ignore);
    let covered = 0;
    for (const bit of mask) covered += bit;
    return covered / (width * height);
}

/**
 * Mean absolute difference over the colour channels between each pair of neighbouring PNG frames. `ignore` lists pixel rectangles
 * {x, y, width, height} left out of the mean (board text); a mask over MAX_IGNORED_RATIO of the frame throws.
 */
function frameSteps(pngBuffers, {ignore = []} = {}) {
    const steps = [];
    let previous = null;
    for (const png of pngBuffers) {
        const frame = decodePng(png);
        if (previous) {
            if (frame.width !== previous.width || frame.height !== previous.height || frame.channels !== previous.channels) throw new Error('Frames differ in size, so no step can be measured.');
            const mask = ignoreMask(frame.width, frame.height, ignore);
            const share = ignoredRatio(frame.width, frame.height, ignore);
            if (share > MAX_IGNORED_RATIO) throw new Error(`The ignored regions cover ${(share * 100).toFixed(1)} percent of the frame, over the ${MAX_IGNORED_RATIO * 100} percent limit; a mask that large hides the picture. Mask less, do not raise the limit.`);
            let sum = 0;
            let count = 0;
            for (let offset = 0; offset < frame.data.length; offset += frame.channels) {
                if (mask[offset / frame.channels]) continue;
                for (let channel = 0; channel < 3; channel++) {
                    sum += Math.abs(frame.data[offset + channel] - previous.data[offset + channel]);
                    count++;
                }
            }
            steps.push(count ? sum / count : 0);
        }
        previous = frame;
    }
    return steps;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = sorted.length >> 1;
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Judge a list of steps. `discrete` clips (exact-step or button-driven scenes) are allowed to jump and pass. Otherwise
 * the clip needs at least one moving step (visible change) and no step above THRESHOLD times the median moving step.
 * Returns {ok, typical, max, ratio, threshold}; typical is 0 and ratio Infinity when nothing moves.
 */
function assessFrameSteps(steps, {discrete} = {}) {
    const moving = steps.filter(step => step > FLOOR);
    const max = steps.length ? Math.max(...steps) : 0;
    const typical = moving.length ? median(moving) : 0;
    const ratio = typical ? max / typical : Infinity;
    return {ok: discrete === true || (moving.length > 0 && ratio <= THRESHOLD), typical, max, ratio, threshold: THRESHOLD};
}

// State check, beside the pixel check: pixels saturate on dense scenes, so the value the app really showed (slider readback,
// board coordinates of the moved point, or the point's screen position on a surface) is compared with the schedule instead.
// SCHEDULE_STEP_LIMIT: no scheduled step may exceed this multiple of the median moving scheduled step. Eased motion peaks above
// the median (measured 1.40x to 2.00x on the three schedules) and a coarse control quantises the schedule to whole control steps; the figures
// measured on the three real schedules are in docs/reviews/feature-streams/clips/capture-path-note.md.
const SCHEDULE_STEP_LIMIT = 3;

const distance = (a, b) => Array.isArray(a) ? Math.hypot(...a.map((value, axis) => value - b[axis])) : Math.abs(a - b);

/**
 * scheduled, observed: one number or coordinate pair per frame. tolerance: largest allowed distance between them per frame.
 * Returns {ok, reason, maxDeviation, worstFrame, maxScheduleStep, typicalScheduleStep, scheduleRatio, tolerance}.
 */
function assessPathSteps({scheduled, observed, tolerance}) {
    if (!Array.isArray(scheduled) || !Array.isArray(observed) || scheduled.length !== observed.length || scheduled.length < 2) throw new Error('assessPathSteps needs equal-length scheduled and observed lists of at least two frames.');
    let maxDeviation = 0, worstFrame = 0;
    scheduled.forEach((value, i) => {
        const deviation = distance(observed[i], value);
        if (!(deviation <= maxDeviation)) { maxDeviation = deviation; worstFrame = i; }
    });
    const steps = scheduled.slice(1).map((value, i) => distance(value, scheduled[i]));
    const moving = steps.filter(step => step > 1e-9);
    const maxScheduleStep = Math.max(...steps);
    const typicalScheduleStep = moving.length ? median(moving) : 0;
    const scheduleRatio = typicalScheduleStep ? maxScheduleStep / typicalScheduleStep : Infinity;
    let reason = null;
    if (!(maxDeviation <= tolerance)) reason = `the app showed a value ${maxDeviation} away from the schedule at frame ${worstFrame} (tolerance ${tolerance}); a control that cannot follow the schedule, such as a coarse or integer stepper, needs motion "discrete-exact-steps" with a discreteReason`;
    else if (!moving.length) reason = 'the schedule never moves';
    else if (scheduleRatio > SCHEDULE_STEP_LIMIT) reason = `the schedule has a step ${scheduleRatio.toFixed(2)}x the typical step (limit ${SCHEDULE_STEP_LIMIT}x); the control's step is too coarse for 71 moving frames, so use motion "discrete-exact-steps" with a discreteReason`;
    return {ok: reason === null, reason, maxDeviation, worstFrame, maxScheduleStep, typicalScheduleStep, scheduleRatio, tolerance};
}

/**
 * The encoder's colour check decodes one background pixel from every frame. A row scene may move a line or circle across any fixed
 * pixel, so a row takes the first pixel, scanning rows from the top-left on a 16 px lattice, whose (2r+1)-square neighbourhood is
 * exactly `background` in every frame (a margin, so compression of nearby edges cannot tint it). Throws if no such pixel exists.
 */
function stillBackgroundPixel(pngBuffers, background, {radius = 8, stride = 16} = {}) {
    const frames = pngBuffers.map(decodePng);
    const {width, height, channels} = frames[0];
    const still = (x, y) => frames.every(frame => {
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
            const offset = ((y + dy) * width + (x + dx)) * channels;
            if (frame.data[offset] !== background[0] || frame.data[offset + 1] !== background[1] || frame.data[offset + 2] !== background[2]) return false;
        }
        return true;
    });
    for (let y = radius; y < height - radius; y += stride) for (let x = radius; x < width - radius; x += stride) if (still(x, y)) return {x, y};
    throw new Error('No pixel stays background in every frame, so the encoder colour check has nowhere to sample.');
}

/**
 * The pixel and colour the encoder's colour check samples for a row clip: the first lattice pixel whose (2r+1)-square neighbourhood
 * is one colour, identical in every frame. Background is preferred at each margin, then any single colour, from the full margin
 * `radius` (on the `stride` lattice) down to `minRadius` (on a lattice of at most 4 px). A scene whose moving grid crosses every
 * background pixel (linear-map) leaves only small still patches. A smaller margin cannot make the check pass falsely: the encoder
 * asserts the exact colour of every decoded frame, so an edge that tints the sample fails the capture.
 */
function stillColourPixel(pngBuffers, background, {radius = 8, stride = 16, minRadius = 3} = {}) {
    const frames = pngBuffers.map(decodePng);
    const {width, height, channels} = frames[0];
    const colourAt = (x, y) => { const o = (y * width + x) * channels; return [frames[0].data[o], frames[0].data[o + 1], frames[0].data[o + 2]]; };
    const flat = (x, y, r, rgb) => frames.every(frame => {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const offset = ((y + dy) * width + (x + dx)) * channels;
            if (frame.data[offset] !== rgb[0] || frame.data[offset + 1] !== rgb[1] || frame.data[offset + 2] !== rgb[2]) return false;
        }
        return true;
    });
    const scan = (r, step, wanted) => {
        for (let y = r; y < height - r; y += step) for (let x = r; x < width - r; x += step) {
            const rgb = wanted || colourAt(x, y);
            if (flat(x, y, r, rgb)) return {x, y, rgb: [...rgb]};
        }
        return null;
    };
    for (let r = radius; r >= Math.min(minRadius, radius); r--) {
        const step = r === radius ? stride : Math.min(stride, 4);
        const found = scan(r, step, background) || scan(r, step, null);
        if (found) return found;
    }
    throw new Error('No pixel keeps one colour in its neighbourhood in every frame, so the encoder colour check has nowhere to sample.');
}

module.exports = {frameSteps, assessFrameSteps, assessPathSteps, ignoredRatio, stillBackgroundPixel, stillColourPixel, SCHEDULE_STEP_LIMIT, MAX_IGNORED_RATIO};
