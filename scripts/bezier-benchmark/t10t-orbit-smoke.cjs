#!/usr/bin/env node
"use strict";

// Bounded 10T orbit measurement only; the handler owns the build and preview.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const {chromium} = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..", "..");
const BASE_URL = option("url", "http://127.0.0.1:4391/bezeg-2.0").replace(/\/$/, "");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT = path.resolve(ROOT, option("out", `.claude/scratch/t10t-orbit-${RUN_ID}`));
const measurements = [];
const failures = [];

function option(name, fallback) {
    const prefix = `--${name}=`;
    return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function digest(bytes) {
    return crypto.createHash("sha256").update(bytes).digest("hex");
}

function quantiles(values) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    const at = q => Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] * 100) / 100;
    return sorted.length ? {n: sorted.length, p50: at(0.5), p95: at(0.95), max: Math.round(sorted.at(-1) * 100) / 100}
        : {n: 0, p50: null, p95: null, max: null};
}

async function cameraValues(page) {
    return page.locator('input[type="range"]').evaluateAll(inputs => inputs.map(input => ({
        label: Array.from(input.labels ?? []).map(label => label.textContent.trim()).join(" "),
        value: input.value,
    })).filter(item => /azimut|azimuth|višinski kot|elevation/i.test(item.label)));
}

async function canvasDetails(page) {
    return page.locator('[role="application"] canvas').evaluate(canvas => {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        const debug = gl?.getExtension("WEBGL_debug_renderer_info");
        return {
            width: canvas.width,
            height: canvas.height,
            renderer: gl ? gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : "WebGL unavailable",
            vendor: gl ? gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR) : "WebGL unavailable",
        };
    });
}

async function screenshotEvidence(page, filePath) {
    const bytes = await page.locator('[role="application"] canvas').screenshot({path: filePath});
    const pixels = await page.evaluate(async base64 => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const scratch = document.createElement("canvas");
        scratch.width = image.naturalWidth;
        scratch.height = image.naturalHeight;
        const context = scratch.getContext("2d", {willReadFrequently: true});
        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, scratch.width, scratch.height).data;
        const background = [data[0], data[1], data[2]];
        let foregroundPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (Math.max(Math.abs(data[i] - background[0]), Math.abs(data[i + 1] - background[1]), Math.abs(data[i + 2] - background[2])) > 28) foregroundPixels++;
        }
        return {width: image.naturalWidth, height: image.naturalHeight, foregroundPixels};
    }, bytes.toString("base64"));
    return {path: path.relative(ROOT, filePath).replaceAll("\\", "/"), sha256: digest(bytes), ...pixels};
}

async function installProbe(page) {
    await page.evaluate(() => {
        const probe = {enabled: false, down: false, lastMove: null, lastFrame: null, pointerMoves: 0, nextRaf: [], activeFrameMs: []};
        window.__t10t = probe;
        addEventListener("pointerdown", event => {
            if (probe.enabled && event.button === 0) { probe.down = true; probe.lastMove = null; probe.lastFrame = null; }
        }, true);
        addEventListener("pointerup", () => { probe.down = false; probe.lastFrame = null; }, true);
        addEventListener("pointercancel", () => { probe.down = false; probe.lastFrame = null; }, true);
        addEventListener("pointermove", () => {
            if (!probe.enabled || !probe.down) return;
            const movedAt = performance.now();
            probe.lastMove = movedAt;
            probe.pointerMoves++;
            requestAnimationFrame(() => probe.nextRaf.push(performance.now() - movedAt));
        }, true);
        const frame = timestamp => {
            if (probe.enabled && probe.down && probe.lastMove !== null && performance.now() - probe.lastMove < 50) {
                if (probe.lastFrame !== null) probe.activeFrameMs.push(timestamp - probe.lastFrame);
                probe.lastFrame = timestamp;
            } else probe.lastFrame = null;
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });
}

async function measureOrbit(page, scene, viewport) {
    const canvas = page.locator('[role="application"] canvas').first();
    const box = await canvas.boundingBox();
    assert(box && box.width > 100 && box.height > 100, `${scene} canvas is missing or too small`);
    const cameraBefore = await cameraValues(page);
    assert(cameraBefore.length >= 2, `${scene} camera sliders were not found`);
    const label = `${viewport.width}x${viewport.height}`;
    const stem = `${scene}-${label}`;
    const beforeImage = await screenshotEvidence(page, path.join(OUT, `${stem}-before.png`));
    await page.evaluate(() => Object.assign(window.__t10t, {enabled: true, down: false, lastMove: null, lastFrame: null, pointerMoves: 0, nextRaf: [], activeFrameMs: []}));

    const sx = box.x + box.width * 0.91;
    const sy = box.y + box.height * 0.22;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 36; i++) {
        const angle = (i / 36) * Math.PI * 1.15;
        await page.mouse.move(sx + Math.cos(angle) * 52, sy + Math.sin(angle) * 30);
        await page.waitForTimeout(8);
    }
    await page.mouse.up();
    await page.waitForTimeout(180);
    const samples = await page.evaluate(() => {
        window.__t10t.enabled = false;
        return {pointerMoves: window.__t10t.pointerMoves, nextRaf: window.__t10t.nextRaf, activeFrameMs: window.__t10t.activeFrameMs};
    });
    const cameraAfter = await cameraValues(page);
    const cameraChanged = cameraBefore.some(before => cameraAfter.some(after => after.label === before.label && after.value !== before.value));
    const afterImage = await screenshotEvidence(page, path.join(OUT, `${stem}-after.png`));
    const result = {
        scene,
        viewport,
        pointermoveToNextRafMs: quantiles(samples.nextRaf),
        activeRafIntervalMs: quantiles(samples.activeFrameMs),
        deliveredPointerMoves: samples.pointerMoves,
        cameraBefore,
        cameraAfter,
        actualCameraChanged: cameraChanged,
        canvasChanged: beforeImage.sha256 !== afterImage.sha256,
        canvasBefore: beforeImage,
        canvasAfter: afterImage,
    };
    measurements.push(result);
    if (!cameraChanged || !result.canvasChanged) failures.push(`${scene} (${label}) did not prove camera movement`);
    if (result.pointermoveToNextRafMs.n < 20 || result.pointermoveToNextRafMs.p95 === null) failures.push(`${scene} (${label}) produced too few pointer timing samples`);
    if (result.pointermoveToNextRafMs.p95 > 16.7) failures.push(`${scene} (${label}) next-rAF p95 exceeds 16.7 ms`);
    if (result.activeRafIntervalMs.p95 === null || result.activeRafIntervalMs.p95 > 50) failures.push(`${scene} (${label}) active rAF interval p95 exceeds 50 ms or was unavailable`);
    process.stdout.write(`${scene} ${label}: pointer→next-rAF ${JSON.stringify(result.pointermoveToNextRafMs)} ms; active rAF interval ${JSON.stringify(result.activeRafIntervalMs)} ms; cameraChanged=${cameraChanged}; canvasChanged=${result.canvasChanged}\n`);
    return result;
}

async function runViewport(browser, viewport) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1, isMobile: viewport.width < 500, hasTouch: viewport.width < 500});
    await context.addInitScript(() => localStorage.setItem("bezeg-2.0:bezeg-language", "sl"));
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    try {
        const response = await page.goto(`${BASE_URL}/patches/joins`, {waitUntil: "domcontentloaded"});
        assert(response?.status() === 200, `patch-joins route returned ${response?.status() ?? "no response"}`);
        await page.locator('[role="application"] canvas').waitFor({state: "visible", timeout: 45000});
        await page.waitForTimeout(700);
        const gpu = await canvasDetails(page);
        assert(gpu.renderer !== "WebGL unavailable", "WebGL renderer unavailable");
        await installProbe(page);
        await measureOrbit(page, "default-pair", viewport);

        const teapotScene = page.locator('[data-join-scene="join-teapot"]');
        assert(await teapotScene.count() > 0, "join-teapot starting scene button not found");
        await teapotScene.click();
        await page.locator(".patch-join-capstone").waitFor({state: "visible"});
        await page.waitForTimeout(700);
        const capstoneText = (await page.locator(".patch-join-capstone").innerText()).replace(/\s+/g, " ");
        assert(/32.*(?:patch|krp)/i.test(capstoneText), "join-teapot owner text does not identify 32 patches");
        const ownerImage = await screenshotEvidence(page, path.join(OUT, `teapot-owner-${viewport.width}x${viewport.height}.png`));
        assert(ownerImage.foregroundPixels > 500, `capstone canvas looks empty (${ownerImage.foregroundPixels} foreground pixels)`);
        const capstoneGpu = await canvasDetails(page);
        await measureOrbit(page, "join-teapot", viewport);
        return {viewport, gpu, capstoneGpu, owner: {visible: true, text: capstoneText, tiling: 8, ...ownerImage}};
    } finally {
        await context.close();
    }
}

async function main() {
    fs.mkdirSync(OUT, {recursive: true});
    const browser = await chromium.launch({headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]});
    const environments = [];
    try {
        for (const viewport of [{width: 1440, height: 1000}, {width: 390, height: 844}]) environments.push(await runViewport(browser, viewport));
    } finally {
        await browser.close();
    }
    const report = {
        createdAt: new Date().toISOString(),
        url: BASE_URL,
        host: {os: `${os.platform()} ${os.release()}`, arch: os.arch(), chromium: browser.version()},
        metricDefinitions: {
            pointermoveToNextRafMs: "time from captured pointermove handler to its next requestAnimationFrame callback; a scheduling proxy, not presentation latency",
            activeRafIntervalMs: "requestAnimationFrame timestamp intervals while pointer movement was recent (<50 ms); idle intervals excluded, not CPU render time",
        },
        requestedScenes: ["patch-joins default pair", "join-teapot Preset (32 patches) at initial tiling 8 per ADR 0018"],
        cacheComparison: "after-only; no scratch baseline build was cheap within this bounded browser assignment",
        environments,
        measurements,
        failures,
    };
    fs.writeFileSync(path.join(OUT, "t10t-results.json"), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`Results: ${path.join(OUT, "t10t-results.json")}\n`);
    if (failures.length) process.exitCode = 1;
}

main().catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
});
