// Extra live smoke for the orientation and polygon-area guided lessons (task 13).
// Run against `just preview 4313`: node docs/reviews/feature-streams/geometry/13-smoke-extra.cjs
const path = require('node:path');
const fs = require('node:fs');
const repo = path.resolve(__dirname, '..', '..', '..', '..');
const {chromium} = require('@playwright/test');
const helpers = require(path.join(repo, 'tests', 'lesson-smoke-helpers.cjs'));
const shots = path.join(__dirname, '13-shots');
fs.mkdirSync(shots, {recursive: true});

const ORIGIN = 'http://127.0.0.1:4313/bezeg-2.0';
const LESSONS = [
    {
        id: 'orientation',
        title: {sl: 'Orientacija treh točk', en: 'Orientation of three points'},
        attr: '[data-orientation-readout]',
        valueAttr: 'data-orientation-value',
        step3Value: '8',
    },
    {
        id: 'polygon-area',
        title: {sl: 'Ploščina večkotnika in Pickov izrek', en: "Polygon area and Pick's theorem"},
        attr: '[data-area-readout]',
        valueAttr: 'data-area-doubled',
        step3Value: '42',
    },
];
const HIDDEN = {sl: /skrite/, en: /hidden/};

const results = [];
const record = (lesson, name, pass, detail) => {
    results.push({lesson, name, pass, detail});
    console.log(`${pass ? 'PASS' : 'FAIL'} [${lesson}] ${name}${detail ? ` :: ${detail}` : ''}`);
};

async function runLesson(browser, lesson) {
    const context = await browser.newContext({viewport: {width: 1366, height: 768}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message)));
    await helpers.useLanguage(page, 'sl');
    await page.goto(`${ORIGIN}/compgeo/${lesson.id}?learn=1`, {waitUntil: 'domcontentloaded'});
    const panel = helpers.lessonPanel(page);
    await panel.waitFor({state: 'visible', timeout: 15000});

    const heading = (await helpers.lessonHeading(page).textContent()) || '';
    record(lesson.id, 'opens in Slovenian', heading.trim() === lesson.title.sl, `heading="${heading.trim()}"`);

    const readout = () => page.locator(lesson.attr);
    const readoutText = async () => ((await readout().first().textContent()) || '').replace(/\s+/g, ' ').trim();
    const readoutValue = () => readout().getAttribute(lesson.valueAttr);

    // Step 2 (predict): values hidden.
    await helpers.advanceToStep(page, 2);
    const hiddenStep2 = await readoutText();
    const valueStep2 = await readoutValue();
    record(lesson.id, 'step 2: readout says values hidden (sl)', HIDDEN.sl.test(hiddenStep2) && valueStep2 === '', `text="${hiddenStep2}" attr="${valueStep2}"`);
    const boardText = (await page.locator('#jgbox').innerText().catch(() => '')).trim();
    const digits = boardText.match(/\d+/g);
    record(lesson.id, 'step 2: no numbers in board text', !digits, digits ? `found ${digits.join(',')} in "${boardText.slice(0, 120)}"` : `board text="${boardText.slice(0, 120)}"`);

    // Next to step 3: value shown.
    await helpers.advance(page);
    await helpers.advanceToStep(page, 3);
    const valueStep3 = await readoutValue();
    const sl3 = await readoutText();
    record(lesson.id, 'step 3: readout shows value', valueStep3 === lesson.step3Value && sl3.includes(lesson.step3Value), `attr="${valueStep3}" text="${sl3}"`);
    await page.screenshot({path: path.join(shots, `${lesson.id}-step3-1366x768.png`)});

    // Live switch to English.
    await page.locator('#bezeg-language').selectOption('en');
    await helpers.settle(page);
    const en3 = await readoutText();
    const enHeading = ((await helpers.lessonHeading(page).textContent()) || '').trim();
    record(lesson.id, 'live switch to EN changes readout text', en3 !== sl3 && (await readoutValue()) === lesson.step3Value, `sl="${sl3}" en="${en3}"`);
    record(lesson.id, 'live switch to EN changes lesson heading', enHeading === lesson.title.en, `heading="${enHeading}"`);

    // Back to step 2: value hidden again.
    for (let guard = 0; guard < 6 && helpers.stepNumber(await helpers.progress(page)) > 2; guard += 1) {
        await helpers.back(page);
    }
    const backStep = helpers.stepNumber(await helpers.progress(page));
    const hiddenAgain = await readoutText();
    const valueAgain = await readoutValue();
    record(lesson.id, 'back to step 2: value hidden again', backStep === 2 && valueAgain === '' && HIDDEN.en.test(hiddenAgain), `step=${backStep} attr="${valueAgain}" text="${hiddenAgain}"`);

    record(lesson.id, 'no page errors', errors.length === 0, errors.length ? errors.join(' | ') : 'none');
    await context.close();
}

(async () => {
    const browser = await chromium.launch();
    try {
        for (const lesson of LESSONS) {
            try {
                await runLesson(browser, lesson);
            } catch (error) {
                record(lesson.id, 'run aborted', false, String(error && error.message).split('\n')[0]);
            }
        }
    } finally {
        await browser.close();
    }
    const failed = results.filter(r => !r.pass).length;
    console.log(`SUMMARY ${results.length - failed}/${results.length} passed`);
    process.exitCode = failed ? 1 : 0;
})();
