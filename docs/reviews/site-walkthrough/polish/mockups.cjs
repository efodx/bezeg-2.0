// Round 2 options for H05 and L02 / L03: restyles the running preview in the browser and screenshots each option.
// Nothing in src/ changes. Usage: node docs/reviews/site-walkthrough/polish/mockups.cjs <outDir>
const {chromium} = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4331';
const out = path.resolve(process.argv[2] || '.command-logs/polish/round2');
fs.mkdirSync(out, {recursive: true});

// ---- H05: header mark -------------------------------------------------------------------------------------------
const petals = [[0, -0.56], [0.533, -0.173], [0.329, 0.453], [-0.329, 0.453], [-0.533, -0.173]];
const stamens = [[0.212, -0.291], [0.342, 0.111], [0, 0.36], [-0.342, 0.111], [-0.212, -0.291]];
const circles = (list, r, dy = 0) => list.map(([x, y]) => `<circle cx="${x}" cy="${y + dy}" r="${r}"/>`).join('');
/** The elderflower of src/images/elderflower.svg, redrawn with a chosen backdrop and an optional outline around the petals. */
function mark({backdrop = '', scale = 176.6, outline = '', petal = '#fffdf4', shade = true}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${backdrop}<g transform="translate(256 ${shade ? 250.7 : 262}) scale(${scale})">`
        + (outline ? `<g fill="${outline}">${circles(petals, 0.435 + 0.075)}</g>` : '')
        + (shade ? `<g fill="#d9d0ac">${circles(petals, 0.45, 0.1)}</g>` : '')
        + `<g fill="${petal}">${circles(petals, 0.435)}</g><g fill="#d6a646"><circle cx="0" cy="0" r="0.21"/>${circles(stamens, 0.05)}</g></g></svg>`;
}
const marks = {
    'current': null,
    'a-round': {svg: mark({backdrop: '<circle cx="256" cy="256" r="256" fill="#244c37"/>', scale: 150}), size: 1.14},
    'b-outline': {svg: mark({outline: '#244c37', scale: 232, shade: false}), size: 1.2},
    'c-tint-round': {svg: mark({backdrop: '<circle cx="256" cy="256" r="256" fill="#dfe9cf"/>', outline: '#244c37', scale: 160, shade: false}), size: 1.2},
    'd-ring': {svg: mark({backdrop: '<circle cx="256" cy="256" r="240" fill="none" stroke="#244c37" stroke-width="26"/>', outline: '#244c37', scale: 138, shade: false}), size: 1.2},
};

// ---- L02 / L03: chapter navigation --------------------------------------------------------------------------------
const chevron = direction => `<svg class="mock-chevron" viewBox="0 0 12 20" aria-hidden="true"${direction === 'next' ? ' style="transform:scaleX(-1)"' : ''}><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const eyebrow = 'font-size:11px;font-weight:700;line-height:1.4;letter-spacing:.08em;text-transform:uppercase;color:var(--bezeg-shell-label)';
const noGlyphs = '.learning-neighbor-label::before,.learning-neighbor-label::after{content:none!important}';
const navigation = {
    'current': {css: '', dom: null},
    // 1: small-caps eyebrow over the title, one large chevron at the card's outer edge; the return control becomes the
    //    breadcrumb the demonstration pages already have.
    '1-eyebrow-chevron': {
        css: `${noGlyphs}
            .learning-neighbors a{grid-template-columns:auto minmax(0,1fr);column-gap:16px;align-items:center}
            .learning-neighbor--next{grid-template-columns:minmax(0,1fr) auto!important}
            .learning-neighbor-label{${eyebrow}} .learning-neighbor--previous .learning-neighbor-label,.learning-neighbor--previous .learning-neighbor-title{grid-column:2}
            .learning-neighbor--next .learning-neighbor-label,.learning-neighbor--next .learning-neighbor-title{grid-column:1}
            .mock-chevron{width:11px;height:19px;grid-row:1 / span 2;color:var(--chapter-link)} .learning-neighbor--previous .mock-chevron{grid-column:1} .learning-neighbor--next .mock-chevron{grid-column:2}
            .chapter-trail .learning-back{min-height:44px;padding:0;border:0;background:none;font-size:13px;font-weight:400;text-decoration:underline;text-underline-offset:3px;color:var(--chapter-muted)}
            .chapter-trail .learning-back svg{display:none} .mock-crumb{color:var(--chapter-muted);font-size:13px;margin-left:6px}
            .chapter-trail-position{display:none!important}`,
        dom: () => {
            document.querySelectorAll('.learning-neighbors a').forEach(link => link.insertAdjacentHTML('afterbegin', link.classList.contains('learning-neighbor--next') ? window.__chevronNext : window.__chevronPrevious));
            const back = document.querySelector('.chapter-trail .learning-back');
            back.lastChild.textContent = document.documentElement.lang === 'en' ? 'Learning' : 'Učenje';
            const position = document.querySelector('.chapter-trail-position').textContent;
            back.insertAdjacentHTML('afterend', `<span class="mock-crumb">/ ${document.querySelector('h1').textContent} · ${position.toLowerCase()}</span>`);
        },
    },
    // 2: no wording at all: the title and one chevron; the return control is a small-caps text link.
    '2-title-only': {
        css: `${noGlyphs}
            .learning-neighbor-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
            .learning-neighbors a{grid-template-columns:auto minmax(0,1fr);column-gap:16px;align-items:center}
            .learning-neighbor--next{grid-template-columns:minmax(0,1fr) auto!important}
            .mock-chevron{width:11px;height:19px;color:var(--chapter-link)} .learning-neighbor--previous .mock-chevron{grid-column:1;grid-row:1} .learning-neighbor--previous .learning-neighbor-title{grid-column:2;grid-row:1}
            .learning-neighbor--next .mock-chevron{grid-column:2;grid-row:1} .learning-neighbor--next .learning-neighbor-title{grid-column:1;grid-row:1}
            .chapter-trail .learning-back{min-height:44px;padding:0;border:0;background:none;gap:9px;${eyebrow};font-size:12px;color:var(--chapter-link)}
            .chapter-trail .learning-back svg{display:none} .chapter-trail .learning-back .mock-chevron{display:block;width:7px;height:12px}`,
        dom: () => {
            document.querySelectorAll('.learning-neighbors a').forEach(link => link.insertAdjacentHTML('afterbegin', link.classList.contains('learning-neighbor--next') ? window.__chevronNext : window.__chevronPrevious));
            document.querySelector('.chapter-trail .learning-back').insertAdjacentHTML('afterbegin', window.__chevronPrevious);
        },
    },
    // 3: no card chrome: a rule above, the eyebrow and the title as plain links; the return control is a plain underlined link.
    '3-plain-links': {
        css: `${noGlyphs}
            .learning-neighbors{border-top:1px solid var(--chapter-border);padding-top:6px}
            .learning-neighbors a{border:0!important;background:none!important;border-radius:8px;padding:12px 0;min-height:64px}
            .learning-neighbors a:hover .learning-neighbor-title{text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:4px}
            .learning-neighbor-label{${eyebrow}}
            .chapter-trail .learning-back{min-height:44px;padding:0;border:0;background:none;font-weight:600;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px}
            .chapter-trail .learning-back svg{display:none}`,
        dom: () => {
            const back = document.querySelector('.chapter-trail .learning-back');
            back.lastChild.textContent = '‹ ' + back.lastChild.textContent;
        },
    },
};

(async () => {
    const browser = await chromium.launch();
    const open = async (width, pathname) => {
        const context = await browser.newContext({viewport: {width, height: 900}, deviceScaleFactor: 2, reducedMotion: 'reduce'});
        await context.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'sl'));
        const page = await context.newPage();
        await page.goto(base + pathname, {waitUntil: 'networkidle'});
        await page.evaluate(() => document.fonts.ready);
        return {context, page};
    };
    for (const width of [1440, 390]) for (const [name, option] of Object.entries(marks)) {
        const {context, page} = await open(width, '/bezeg-2.0/');
        if (option) await page.evaluate(({svg, size}) => {
            const image = document.querySelector('.app-brand img');
            image.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
            image.style.cssText = `width:${size}em;height:${size}em;translate:0 -.03em`;
            document.querySelector('.app-brand').style.gap = '.28em';
        }, option);
        await page.waitForTimeout(150);
        await page.screenshot({path: path.join(out, `mark-${name}-${width}.png`), clip: {x: 0, y: 0, width: Math.min(width, 560), height: width === 390 ? 65 : 73}});
        await context.close();
    }
    for (const width of [1440, 390]) for (const [name, option] of Object.entries(navigation)) {
        const {context, page} = await open(width, '/bezeg-2.0/learn/bezier-curves');
        await page.evaluate(({previous, next}) => { window.__chevronPrevious = previous; window.__chevronNext = next; }, {previous: chevron('previous'), next: chevron('next')});
        if (option.css) await page.addStyleTag({content: option.css});
        if (option.dom) await page.evaluate(option.dom);
        await page.waitForTimeout(150);
        for (const [part, selector] of [['return', '.chapter-trail'], ['neighbors', '.learning-neighbors']]) {
            const target = page.locator(selector).first();
            await target.scrollIntoViewIfNeeded();
            const box = await target.boundingBox();
            await page.screenshot({path: path.join(out, `nav-${name}-${part}-${width}.png`), clip: {x: Math.max(0, box.x - 12), y: box.y - 10, width: box.width + 24, height: box.height + 20}});
        }
        await context.close();
    }
    await browser.close();
    console.log('wrote', out, fs.readdirSync(out).length, 'files');
})().catch(error => { console.error(error); process.exit(1); });
