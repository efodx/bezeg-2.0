import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const root = process.cwd();
const out = path.join(root, "docs/reviews/bezier-patches/three-focused-artifacts/run-2026-10-26-1933");
const url = "http://127.0.0.1:4181/docs/prototypes/bezier-patches/three.html";
const expectedHash = "F2C277B0DA2D33A3B2C0A66F7887F915ED7DA8F50C478BD3F55CA6B1D7D4900F";
const started = Date.now();
const result = { url, preview: "local isolated acceptance copy", revision: "be078cd", dirty: "pre-existing measure.mjs edit plus handoff files and .worktrees; prototype copy hash-matched", viewport: "1280x900 desktop; 390x844 narrow", browser: "Playwright Chromium, headless", servedPrototypeSha256: null, checks: [], runtimeErrors: [], consoleErrors: [], downloads: [], screenshots: [], elapsedMs: 0 };
async function save() { result.elapsedMs = Date.now() - started; await fs.writeFile(path.join(out, "results.json"), JSON.stringify(result, null, 2)); }
function need(ok, message) { if (!ok) throw new Error(message); }
async function check(name, fn) {
  try { const evidence = await fn(); result.checks.push({ name, status: "passed", evidence }); }
  catch (e) { result.checks.push({ name, status: "failed", evidence: e && e.message ? e.message : String(e) }); }
  await save();
}
async function snap(page) { return await page.evaluate(() => window.BezierPatchSpike.snapshot()); }
async function pointSpot(page, index) {
  return await page.locator("#labels").evaluate((host, n) => {
    const el = Array.from(host.children).find(x => x.textContent.trim() === String(n + 1));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, index);
}
async function canvasHash(page) {
  const data = await page.locator("#main-board canvas").evaluate(el => el.toDataURL("image/png"));
  return crypto.createHash("sha256").update(data).digest("hex");
}
async function shot(page, name) {
  const p = path.join(out, name);
  await page.screenshot({ path: p, fullPage: true });
  result.screenshots.push(path.relative(root, p));
  await save();
  return p;
}
async function touchDrag(cdp, x, y, dx, dy) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx, y: y + dy, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
(async () => {
  await fs.mkdir(path.join(out, "downloads"), { recursive: true });
  const sourceResponse = await fetch(url.replace("three.html", "three-prototype.js"));
  need(sourceResponse.ok, "served three-prototype.js did not return 200");
  const servedBytes = Buffer.from(await sourceResponse.arrayBuffer());
  result.servedPrototypeSha256 = crypto.createHash("sha256").update(servedBytes).digest("hex");
need(result.servedPrototypeSha256 === expectedHash.toLowerCase(), "served THREE source hash differs from approved baseline");
  await save();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", e => result.runtimeErrors.push(e.message));
  page.on("console", m => { if (m.type() === "error") result.consoleErrors.push(m.text()); });
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => window.BezierPatchSpike && window.BezierPatchSpike.ready(), null, { timeout: 15000 });

  await check("Rendered tensor baseline", async () => {
    const s = await snap(page);
    need(s && s.kind === "tensor" && s.counts && typeof s.counts.meshTriangles === "number", "missing/null tensor snapshot or rendered mesh count");
    need(s.counts.meshTriangles > 0 && s.counts.controlPoints === 16, "tensor surface or 16-point net missing");
    need(await page.locator("#main-board canvas").count() === 1, "expected one rendered WebGL canvas");
    await shot(page, "tensor-initial.png");
    return { meshTriangles: s.counts.meshTriangles, controlPoints: s.counts.controlPoints, canvasHash: await canvasHash(page) };
  });

  await check("Tensor mouse XY drag", async () => {
    const before = await snap(page), p0 = before.net[0], spot = await pointSpot(page, 0), hash0 = await canvasHash(page);
    need(spot, "control-point label 1 missing; cannot target actual net point");
    await page.mouse.move(spot.x, spot.y); await page.mouse.down(); await page.mouse.move(spot.x + 72, spot.y + 24, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(100);
    const after = await snap(page), p1 = after.net[0], hash1 = await canvasHash(page);
    await shot(page, "tensor-after-mouse-drag.png");
    need(Math.hypot(p1[0]-p0[0], p1[1]-p0[1]) > 1e-5, "mouse drag did not change point XY");
    need(Math.abs(p1[2]-p0[2]) < 1e-8, "XY drag changed point z");
    need(JSON.stringify(before.camera) === JSON.stringify(after.camera), "camera moved during point drag");
    need(hash0 !== hash1, "WebGL canvas pixels did not change after drag");
    return { before: p0, after: p1, cameraUnchanged: true, renderedPixelsChanged: true };
  });

  await check("Rendered triangular surface and mouse drag", async () => {
    await page.locator("#kind").selectOption("triangular");
    const before = await snap(page);
    need(before.kind === "triangular" && before.net.length === 10 && typeof before.counts.meshTriangles === "number" && before.counts.meshTriangles > 0, "missing/null rendered triangle data");
    const spot = await pointSpot(page, 0), p0 = before.net[0], hash0 = await canvasHash(page);
    need(spot, "triangle control-point label missing");
    await page.mouse.move(spot.x, spot.y); await page.mouse.down(); await page.mouse.move(spot.x + 55, spot.y - 18, { steps: 7 }); await page.mouse.up();
    await page.waitForTimeout(100);
    const after = await snap(page), p1 = after.net[0], hash1 = await canvasHash(page);
    await shot(page, "triangle-after-mouse-drag.png");
    need(Math.hypot(p1[0]-p0[0], p1[1]-p0[1]) > 1e-5 && Math.abs(p1[2]-p0[2]) < 1e-8, "triangle mouse XY drag did not move in plane");
    need(hash0 !== hash1, "triangle WebGL pixels did not change");
    return { points: after.net.length, meshTriangles: after.counts.meshTriangles, before: p0, after: p1 };
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await page.evaluate(() => { window.__pointerKinds = []; document.querySelector("#main-board").addEventListener("pointerdown", e => window.__pointerKinds.push(e.pointerType), true); });
  await check("Touch XY and z drag with fixed camera", async () => {
    await page.locator("#z-mode").uncheck();
    let before = await snap(page), p0 = before.net[1], spot = await pointSpot(page, 1);
    need(spot, "touch target label missing");
    await touchDrag(cdp, spot.x, spot.y, 58, 20); await page.waitForTimeout(100);
    let after = await snap(page), p1 = after.net[1];
    need(Math.hypot(p1[0]-p0[0], p1[1]-p0[1]) > 1e-5 && Math.abs(p1[2]-p0[2]) < 1e-8, "touch XY drag failed its plane constraint");
    need(JSON.stringify(before.camera) === JSON.stringify(after.camera), "camera changed during touch XY point drag");
    await page.locator("#z-mode").check();
    before = await snap(page); p0 = before.net[1]; spot = await pointSpot(page, 1);
    await touchDrag(cdp, spot.x, spot.y, 0, -62); await page.waitForTimeout(100);
    after = await snap(page); p1 = after.net[1];
    need(Math.abs(p1[2]-p0[2]) > 1e-5 && Math.hypot(p1[0]-p0[0], p1[1]-p0[1]) < 1e-8, "touch z drag changed wrong coordinates");
    need(JSON.stringify(before.camera) === JSON.stringify(after.camera), "camera changed during touch z drag");
    const kinds = await page.evaluate(() => window.__pointerKinds);
    need(kinds.includes("touch"), "browser did not deliver touch pointer events");
    await shot(page, "triangle-after-touch-edits.png");
    return { pointerKinds: kinds, xyBefore: before.net[1], zAfter: p1, cameraUnchanged: true };
  });

  await check("Touch orbit and keyboard orbit", async () => {
    const board = await page.locator("#main-board").boundingBox();
    let before = await snap(page);
    await touchDrag(cdp, board.x + board.width - 24, board.y + 24, -58, 30);
    await page.waitForTimeout(80);
    let after = await snap(page);
    need(before.camera.az !== after.camera.az || before.camera.el !== after.camera.el, "touch orbit did not change camera");
    await page.locator("#main-board").focus();
    before = await snap(page); await page.keyboard.press("ArrowLeft"); after = await snap(page);
    need(before.camera.az !== after.camera.az, "ArrowLeft did not orbit camera");
    return { touchCamera: after.camera, keyboardChangedAzimuth: true };
  });

  await check("Parameter inset pointer", async () => {
    await page.locator("#kind").selectOption("tensor");
    const before = await snap(page);
    const info = await page.locator("#domain-board").evaluate(el => {
      const r = el.getBoundingClientRect(), plot = el.dataset.plot.split(",").map(Number);
      return { x: r.left + plot[0] + plot[2] * .76, y: r.top + plot[1] + plot[2] * .24 };
    });
    await page.mouse.click(info.x, info.y);
    const after = await snap(page);
    need(Math.abs(after.uv[0] - before.uv[0]) > .1 || Math.abs(after.uv[1] - before.uv[1]) > .1, "inset pointer did not update u,v");
    return { before: before.uv, after: after.uv };
  });

  await check("Four preset views depth evidence", async () => {
    const views = {};
    for (const name of ["front", "top", "side", "isometric"]) {
      await page.locator('[data-view="' + name + '"]').click();
      await page.waitForTimeout(60);
      views[name] = (await snap(page)).camera;
      await shot(page, "view-" + name + ".png");
    }
    need(Object.keys(views).length === 4, "one or more preset screenshots missing");
    return { cameras: views, screenshots: ["view-front.png","view-top.png","view-side.png","view-isometric.png"], visualDepthReview: "screenshots retained for visual inspection" };
  });

  await check("Actual 32-patch teapot", async () => {
    await page.locator("#stress").click();
    await page.waitForFunction(() => window.BezierPatchSpike.snapshot().kind === "teapot", null, { timeout: 5000 });
    const s = await snap(page);
    need(s && s.counts && typeof s.counts.teapotPatches === "number" && s.counts.teapotPatches === 32, "missing/null 32-patch teapot rendering data");
    need(s.counts.meshTriangles > 0, "teapot mesh did not render triangles");
    await shot(page, "actual-32-patch-teapot.png");
    return { teapotPatches: s.counts.teapotPatches, meshTriangles: s.counts.meshTriangles, drawCalls: s.counts.drawCalls };
  });

  await check("SVG and PNG downloads contain labels", async () => {
    await page.locator("#kind").selectOption("tensor");
    const dl1p = page.waitForEvent("download"); await page.locator("#export-svg").click(); const dl1 = await dl1p;
    const svgPath = path.join(out, "downloads", "bezier-patch-three.svg"); await dl1.saveAs(svgPath);
    const svg = await fs.readFile(svgPath, "utf8");
    need(svg.includes("<svg") && svg.includes("<polygon") && svg.includes("<polyline"), "SVG lacks rendered surface or line geometry");
    need(svg.includes("<text") && svg.includes("P(u,v)"), "SVG label text missing");
    const dl2p = page.waitForEvent("download"); await page.locator("#export-png").click(); const dl2 = await dl2p;
    const pngPath = path.join(out, "downloads", "bezier-patch-three.png"); await dl2.saveAs(pngPath);
    const png = await fs.readFile(pngPath);
    need(png.length > 100 && png.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", "PNG download is missing or invalid");
    need(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0, "PNG dimensions invalid");
    result.downloads.push(path.relative(root, svgPath), path.relative(root, pngPath));
    await save();
    return { svgBytes: Buffer.byteLength(svg), svgLabels: (svg.match(/<text/g) || []).length, pngBytes: png.length, pngSize: [png.readUInt32BE(16), png.readUInt32BE(20)] };
  });

  await check("Presentation, resize, and 390px viewport", async () => {
    await page.locator("#presentation").click();
    let presentation = await page.evaluate(() => ({ active: document.body.classList.contains("presentation"), aside: getComputedStyle(document.querySelector("aside")).display }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, board: document.querySelector("#main-board").getBoundingClientRect().toJSON(), canvas: document.querySelector("#main-board canvas").getBoundingClientRect().toJSON() }));
    await shot(page, "presentation-narrow-390.png");
    need(presentation.active && presentation.aside === "none", "presentation mode did not hide controls panel");
    need(layout.board.width > 0 && layout.canvas.width > 0, "graph disappeared after viewport resize");
    need(layout.scrollWidth <= layout.width, "narrow viewport has horizontal overflow");
    return { presentation, layout };
  });

  await check("Repeated dispose/remount and toolbar response", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator("#presentation").click();
    await page.locator("#remount").click();
    await page.waitForFunction(() => window.BezierPatchSpike.ready(), null, { timeout: 10000 });
    await page.waitForTimeout(100);
    let s = await snap(page);
    need(s.ready && await page.locator("#main-board canvas").count() === 1, "first remount did not leave one ready canvas");
    const before = s.camera;
    await page.locator('[data-view="front"]').click();
    await page.waitForTimeout(80);
    const after = (await snap(page)).camera;
    await shot(page, "after-ui-remount.png");
    const firstToolbarChanged = JSON.stringify(before) !== JSON.stringify(after);
    const second = await page.evaluate(async () => await window.BezierPatchSpike.remount());
    need(second.ready && await page.locator("#main-board canvas").count() === 1, "second remount did not leave one ready canvas");
    const secondBefore = await snap(page);
    await page.locator('[data-view="top"]').click();
    await page.waitForTimeout(80);
    const secondAfter = await snap(page);
    await shot(page, "after-second-remount.png");
    need(firstToolbarChanged && JSON.stringify(secondBefore.camera) !== JSON.stringify(secondAfter.camera), "preset toolbar stopped responding after remount");
    return { firstRemountReady: s.ready, secondRemountReady: second.ready, canvasCount: 1, toolbarAfterRemount: "responsive" };
  });

  const racePage = await context.newPage();
  let releaseFetch;
  let fetchArrivedResolve;
  const fetchArrived = new Promise(resolve => { fetchArrivedResolve = resolve; });
  const release = new Promise(resolve => { releaseFetch = resolve; });
  let racePageError = "";
  racePage.on("pageerror", e => { racePageError = e.message; result.runtimeErrors.push("race: " + e.message); });
  await racePage.route("**/teapot-data.json", async route => { fetchArrivedResolve(); await release; await route.continue(); });
  await check("Async setup/dispose race", async () => {
    await racePage.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await Promise.race([fetchArrived, new Promise((_, reject) => setTimeout(() => reject(new Error("teapot-data fetch not intercepted")), 6000))]);
    await racePage.evaluate(() => window.BezierPatchSpike.dispose());
    releaseFetch();
    await racePage.waitForTimeout(700);
    const status = await racePage.locator("#status").textContent();
    need(!(racePageError || status.includes("Prototype failed")), "dispose during pending fetch caused setup error: " + (racePageError || status));
    return { disposedWhileTeapotFetchPending: true, pageError: racePageError, status };
  });

  await save();
  await context.close();
  await browser.close();
  console.log(JSON.stringify({ output: path.relative(root, out), elapsedMs: result.elapsedMs, checks: result.checks.map(x => ({ name: x.name, status: x.status })), screenshots: result.screenshots.length, downloads: result.downloads, runtimeErrors: result.runtimeErrors.slice(0, 8), consoleErrors: result.consoleErrors.slice(0, 8) }));
})().catch(async e => {
  result.fatal = e && e.stack ? e.stack : String(e);
  await save();
  console.error(result.fatal);
  process.exitCode = 1;
});
