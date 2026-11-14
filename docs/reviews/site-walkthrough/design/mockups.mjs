// Option mockups for the site walkthrough design package, rendered from the real pages of a running preview.
// Each mockup loads the production page and applies the option as injected CSS / DOM, then screenshots it.
// Usage: node mockups.mjs [origin] [name-filter]
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const origin = process.argv[2] ?? 'http://127.0.0.1:4332';
const filter = process.argv[3] ?? '';
const out = path.join(here, 'img');
const base = `${origin}/bezeg-2.0`;
const browser = await chromium.launch();

const poolMeta = {
    'analysis/epicycles': ['Epicikli', 'Analiza'],
    'analysis/fixed-point': ['Negibna točka in iteracija', 'Analiza'],
    'analysis/accumulation': ['Akumulirani integral', 'Analiza'],
    'functions/integral': ['Določeni integral', 'Funkcije'],
    'functions/inverse': ['Inverzna funkcija in logaritem', 'Funkcije'],
    'complex-multiplication': ['Kompleksno množenje', 'Osnove'],
    'bezier/subdivision-2': ['Subdivizija', 'Bezierjeve krivulje'],
    'analysis/darboux': ['Darbouxove vsote', 'Analiza'],
    'bezier/decasteljau': ['De Casteljau', 'Bezierjeve krivulje'],
};
const pool = JSON.parse(readFileSync(path.join(here, 'pool.json'), 'utf8'))
    .map(entry => ({...entry, title: poolMeta[entry.route][0], family: poolMeta[entry.route][1]}));

async function shot(name, url, {width = 1440, height = 900, scale = 1, before, clip, fullPage = false} = {}) {
    if (filter && !name.includes(filter)) return;
    const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: scale, reducedMotion: 'reduce'});
    const page = await context.newPage();
    try {
        await page.goto(url, {waitUntil: 'networkidle'});
        await page.waitForTimeout(1000);
        const result = before ? await before(page) : undefined;
        await page.waitForTimeout(250);
        await page.screenshot({path: path.join(out, `${name}.png`), clip: result?.clip ?? clip, fullPage});
        console.log('ok', name);
    } catch (error) {
        console.log('FAIL', name, String(error).split('\n').slice(0, 2).join(' '));
    } finally {
        await context.close();
    }
}

// ---------- Home: H02 label and pool, H03 navigation, H04 learning route ----------

const H03 = {
    cards: `
.demonstrations-opening-controls{display:none!important}
.demonstrations-opening-rail{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px!important;overflow:visible!important;max-width:1100px!important;margin:16px 0 0!important;padding:0!important}
.demonstrations-opening-choice{position:relative;flex-direction:column;align-items:stretch!important;gap:0!important;padding:0!important;overflow:hidden;min-height:0!important}
.demonstrations-opening-choice-thumb{width:100%!important;height:auto!important;aspect-ratio:720/440;flex:none!important;border:0!important;border-bottom:1px solid var(--bezeg-shell-rule)!important;border-radius:0!important}
.demonstrations-opening-choice-copy{padding:9px 11px 11px;white-space:normal!important}
.demonstrations-opening-choice-title{white-space:normal!important;font-size:13.5px!important;line-height:1.25!important;margin-bottom:3px}
.demonstrations-opening-choice[aria-pressed="true"]::after{content:"";position:absolute;left:0;top:0;width:45%;height:3px;background:var(--bezeg-shell-action)}`,
    edge: `
.home-demonstrations-carousel{position:relative}
.demonstrations-opening-controls{position:absolute;left:0;right:0;top:0;height:var(--mock-preview-h);margin:0!important;justify-content:space-between!important;pointer-events:none}
.demonstrations-opening-controls>span{display:none}
.demonstrations-opening-controls button{margin-inline:-22px;box-shadow:0 4px 14px rgb(25 55 47 / .16);background:var(--bezeg-shell-panel)!important}
.demonstrations-opening-rail{margin-top:14px!important}`,
    plain: `
.demonstrations-opening-controls{display:none!important}
.demonstrations-opening-rail{margin-top:14px!important}`,
};

const H04 = {
    buttons: page => page.evaluate(() => {
        const primary = document.querySelector('.welcome-primary');
        const wrap = document.createElement('div');
        const style = getComputedStyle(primary);
        wrap.style.cssText = `grid-area:${style.gridArea};display:flex;flex-wrap:wrap;gap:12px;margin-top:${style.marginTop};justify-self:start`;
        primary.replaceWith(wrap);
        primary.style.marginTop = '0';
        const secondary = primary.cloneNode(true);
        secondary.firstChild.textContent = 'Vsa učna vsebina ';
        secondary.style.cssText = 'margin-top:0;background:transparent;box-shadow:inset 0 0 0 1.5px var(--bezeg-shell-action)';
        secondary.style.setProperty('color', 'var(--bezeg-shell-action)', 'important');
        wrap.append(primary, secondary);
    }),
    doors: page => page.evaluate(() => {
        const primary = document.querySelector('.welcome-primary');
        const wrap = document.createElement('div');
        const style = getComputedStyle(primary);
        wrap.style.cssText = `grid-area:${style.gridArea};display:grid;grid-template-columns:repeat(2,minmax(0,330px));gap:14px;margin-top:${style.marginTop}`;
        const door = (title, text, filled) => `<a style="display:block;padding:16px 18px 15px;border-radius:12px;text-decoration:none;${filled
            ? 'background:var(--bezeg-shell-action);color:#fff' : 'background:var(--bezeg-shell-panel);color:var(--bezeg-shell-ink);box-shadow:inset 0 0 0 1px var(--bezeg-shell-rule)'}">
            <span style="display:flex;justify-content:space-between;font:var(--bezeg-type-title-weight) 22px var(--bezeg-font-display)">${title}<span>→</span></span>
            <span style="display:block;margin-top:4px;font-size:14.5px;opacity:.86">${text}</span></a>`;
        wrap.innerHTML = door('Demonstracije', 'Interaktivni grafi po področjih', true) + door('Učenje', 'Poglavja z vodenimi primeri', false);
        primary.replaceWith(wrap);
    }),
};

async function home(page, {label, h03, h04, usePool}) {
    if (label) await page.evaluate(text => { document.querySelector('#starting-demonstrations').textContent = text; }, label);
    if (h04) await H04[h04](page);
    if (usePool) await page.evaluate(entries => {
        const choices = [...document.querySelectorAll('.demonstrations-opening-choice')];
        choices.forEach((choice, index) => {
            const entry = entries[index];
            choice.querySelector('img').src = entry.img;
            choice.querySelector('.demonstrations-opening-choice-title').textContent = entry.title;
            choice.querySelector('.demonstrations-opening-family').textContent = entry.family;
        });
        const selected = document.querySelector('.demonstrations-opening-image[data-selected="true"]');
        selected.querySelectorAll('img').forEach(img => { img.src = entries[0].img; });
        selected.querySelectorAll('video').forEach(video => video.remove());
        const copy = document.querySelector('.demonstrations-opening-copy');
        copy.querySelector('h3').textContent = entries[0].title;
        copy.querySelector('.demonstrations-opening-family').textContent = entries[0].family;
        copy.querySelector('p').textContent = 'Premikaj zanko, povečaj število členov N in pritisni predvajanje. Kako se krožnice sestavijo v krivuljo?';
    }, pool);
    if (h03) {
        const h = await page.evaluate(() => document.querySelector('.demonstrations-opening-preview').getBoundingClientRect().height);
        await page.addStyleTag({content: `:root{--mock-preview-h:${h}px}${H03[h03]}`});
    }
    await page.waitForTimeout(600);
}

const homeSize = {width: 1440, height: 980};
await shot('h03-current', base, homeSize);
await shot('h03-a-cards', base, {...homeSize, before: p => home(p, {h03: 'cards'})});
await shot('h03-b-edge-arrows', base, {...homeSize, before: p => home(p, {h03: 'edge'})});
await shot('h03-c-rail-only', base, {...homeSize, before: p => home(p, {h03: 'plain'})});
const introClip = {clip: {x: 150, y: 80, width: 1140, height: 380}};
await shot('h04-current', base, {...homeSize, ...introClip});
await shot('h04-a-two-buttons', base, {...homeSize, ...introClip, before: p => home(p, {h04: 'buttons'})});
await shot('h04-b-doors', base, {...homeSize, clip: {x: 150, y: 80, width: 1140, height: 420}, before: p => home(p, {h04: 'doors'})});
await shot('home-recommended', base, {...homeSize, before: p => home(p, {label: 'Izbor demonstracij', h03: 'cards', h04: 'buttons', usePool: true})});

// ---------- L01: chapter section numbering ----------

const chapters = {bezier: `${base}/learn/bezier-curves`, family: `${base}/learn/convexity-hulls`};
async function chapter(page, mode) {
    await page.evaluate(mode => {
        const headings = [...document.querySelectorAll('.chapter-section-heading')];
        const tocLinks = [...document.querySelectorAll('.chapter-layout nav ol li a')];
        const headingNumbers = mode === 'all';
        const tocNumbers = mode === 'all' || mode === 'toc';
        headings.forEach((heading, index) => {
            const existing = heading.querySelector(':scope > span:first-child');
            const isNumber = existing && /^\d+$/.test(existing.textContent.trim());
            if (headingNumbers && !isNumber) {
                const span = document.createElement('span');
                span.textContent = String(index + 1).padStart(2, '0');
                heading.prepend(span);
            }
            if (!headingNumbers && isNumber) existing.remove();
        });
        tocLinks.forEach((link, index) => {
            const existing = link.querySelector('.chapter-toc-number');
            if (tocNumbers && !existing) {
                const span = document.createElement('span');
                span.className = 'chapter-toc-number';
                span.textContent = String(index + 1);
                link.append(span);
            }
            if (!tocNumbers && existing) existing.remove();
        });
        const first = headings[0].getBoundingClientRect();
        window.scrollTo(0, window.scrollY + first.top - 190);
    }, mode);
    await page.waitForTimeout(500);
}
for (const [id, url] of Object.entries(chapters)) {
    for (const [option, mode] of [['a-none', 'none'], ['b-everywhere', 'all'], ['c-contents-only', 'toc']]) {
        await shot(`l01-${option}-${id}`, url, {width: 1440, height: 520, before: p => chapter(p, mode)});
    }
}

// ---------- L04: guided example Back button ----------

const L04 = {
    current: '',
    ghost: '.guided-lesson .guided-lesson-navigation button.guided-lesson-nav-back{background:transparent;border-color:#9aaa87;color:#243b2b}',
    tinted: '.guided-lesson .guided-lesson-navigation button.guided-lesson-nav-back{background:#eef2e3;border-color:#c9d3b8;color:#244c37}',
    quiet: '.guided-lesson .guided-lesson-navigation button.guided-lesson-nav-back{background:transparent;border-color:transparent;color:var(--bezeg-shell-ink-secondary,#526152);font-weight:600}',
};
for (const [option, css] of Object.entries({'current': L04.current, 'a-outline': L04.ghost, 'b-tinted': L04.tinted, 'c-quiet': L04.quiet})) {
    await shot(`l04-${option}`, `${base}/analysis/darboux?learn=1`, {scale: 2, before: async page => {
        await page.locator('.guided-lesson-nav-next').click();
        await page.waitForTimeout(700);
        if (css) await page.addStyleTag({content: css});
        await page.mouse.move(5, 5);
        const box = await page.locator('.guided-lesson').boundingBox();
        return {clip: {x: box.x - 14, y: box.y - 14, width: box.width + 28, height: 250}};
    }});
}

// ---------- P01 / P02: presets ----------

const P01A = `
.modal-backdrop.show{opacity:.38;background:#19372f}
.modal-dialog{max-width:440px;margin-top:17vh}
.modal-content{background:var(--bezeg-shell-panel,#fffdf5);border:1px solid var(--bezeg-shell-rule,#d6dccb);border-radius:16px;box-shadow:0 24px 60px rgb(25 55 47 / .24);color:var(--bezeg-shell-ink,#19372f)}
.modal-header{border-bottom:0;padding:22px 24px 2px}
.modal-title{font-family:var(--bezeg-font-display);font-size:27px;font-weight:var(--bezeg-type-title-weight);letter-spacing:-.01em;line-height:1.15}
.modal-header .btn-close{opacity:.55;font-size:12px}
.modal-body{padding:10px 24px 4px}
.modal-body .form-label{margin-bottom:6px;font-size:13.5px;font-weight:700}
.modal-body .form-control{padding:10px 12px;border:1px solid #9aaa87;border-radius:8px;background:#fff;font-size:16px;box-shadow:none}
.modal-body .mock-help{margin:8px 0 0;color:var(--bezeg-shell-ink-secondary,#526152);font-size:13px;line-height:1.45}
.modal-footer{border-top:0;padding:12px 24px 22px;gap:8px}
.modal-footer .btn{min-height:44px;margin:0;padding:9px 18px;border-radius:8px;font-weight:700}
.modal-footer .btn-secondary{background:transparent;border-color:#9aaa87;color:#243b2b}
.modal-footer .btn-primary{background:var(--bezeg-shell-action,#244c37);border-color:var(--bezeg-shell-action,#244c37)}`;

async function openPresets(page) {
    await page.getByRole('tab', {name: 'Shrani'}).or(page.locator('button', {hasText: /^Shrani$/}).first()).first().click();
    await page.waitForTimeout(500);
}
async function openSave(page, name) {
    await openPresets(page);
    await page.locator('.preset-save').click();
    await page.waitForTimeout(500);
    await page.locator('.modal input[type=text]').fill(name);
}
const demo = `${base}/analysis/darboux`;
await shot('p02-current-panel', demo, {scale: 2, before: async page => {
    await openPresets(page);
    const box = await page.locator('.preset-actions').boundingBox();
    return {clip: {x: 1076, y: 260, width: 310, height: Math.min(640, box.y + box.height - 260 + 40)}};
}});
await shot('p01-current', demo, {before: page => openSave(page, 'parabola-4-deli')});
await shot('p01-a-restyled-dialog', demo, {before: async page => {
    await openSave(page, 'parabola-4-deli');
    await page.addStyleTag({content: P01A});
    await page.evaluate(() => {
        const help = document.createElement('p');
        help.className = 'mock-help';
        help.textContent = 'Shrani trenutno stanje grafa v ta brskalnik. Če ime že obstaja, se prednastavitev prepiše.';
        document.querySelector('.modal-body .form-control').after(help);
        document.querySelector('.modal-footer .btn-secondary').textContent = 'Prekliči';
    });
}});

const PANEL_CSS = `
.mock-panel{font-size:14px;color:var(--bezeg-shell-ink,#19372f)}
.mock-panel h4{margin:0 0 8px;font-size:14px;font-weight:700}
.mock-panel p{margin:0 0 10px;color:var(--bezeg-shell-ink-secondary,#526152);font-size:12.5px;line-height:1.5}
.mock-panel .mock-input{box-sizing:border-box;width:100%;min-height:40px;padding:8px 10px;border:1px solid #6f7d68;border-radius:7px;background:#fff;font:inherit}
.mock-panel .mock-row{display:flex;gap:8px;margin-top:8px}
.mock-panel .mock-btn{flex:1 1 0;min-height:40px;padding:7px 10px;border:1px solid #6f7d68;border-radius:7px;background:transparent;color:inherit;font:600 13.5px/1.2 inherit;text-align:center}
.mock-panel .mock-btn.primary{border-color:var(--bezeg-shell-action,#244c37);background:var(--bezeg-shell-action,#244c37);color:#fff}
.mock-panel .mock-list{margin:0 0 10px;padding:0;border:1px solid var(--bezeg-shell-rule,#d6dccb);border-radius:9px;overflow:hidden;list-style:none;background:#fff}
.mock-panel .mock-list li{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 6px 0 12px;border-top:1px solid var(--bezeg-shell-rule,#d6dccb)}
.mock-panel .mock-list li:first-child{border-top:0}
.mock-panel .mock-list li[data-on]{background:#eef2e3;font-weight:700;box-shadow:inset 3px 0 0 var(--bezeg-shell-action,#244c37)}
.mock-panel .mock-list li span{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mock-panel .mock-list small{flex:none;color:var(--bezeg-shell-ink-secondary,#526152);font-size:11.5px;font-weight:400}
.mock-panel .mock-more{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:6px;color:#526152;font-size:18px;letter-spacing:1px}
.mock-panel hr{margin:16px 0 12px;border:0;border-top:1px solid var(--bezeg-shell-rule,#d6dccb);opacity:1}
.mock-panel .mock-note{margin:6px 0 0;font-size:12px}`;

async function mockPanel(page, html) {
    await openPresets(page);
    await page.addStyleTag({content: PANEL_CSS});
    const box = await page.evaluate(html => {
        const actions = document.querySelector('.preset-actions');
        const select = document.querySelector('select[aria-label="Prednastavitve"]');
        let group = actions;
        while (group && !group.contains(select)) group = group.parentElement;
        group.innerHTML = `<div class="mock-panel">${html}</div>`;
        const rect = group.getBoundingClientRect();
        return {y: rect.y, height: rect.height};
    }, html);
    return {clip: {x: 1076, y: 260, width: 310, height: Math.min(640, box.y + box.height - 260 + 28)}};
}

await shot('p01-b-inline-save', demo, {scale: 2, before: page => mockPanel(page, `
    <p>Shranjeno v tem brskalniku. Izvozi datoteko za varnostno kopijo ali prenos v drug brskalnik.</p>
    <h4>Ime nove prednastavitve</h4>
    <input class="mock-input" value="parabola-4-deli">
    <div class="mock-row"><span class="mock-btn primary">Shrani</span><span class="mock-btn">Prekliči</span></div>
    <p class="mock-note">Shrani trenutno stanje grafa. Če ime že obstaja, se prednastavitev prepiše.</p>
    <hr>
    <div class="mock-row"><span class="mock-btn">Izvozi prednastavitve</span><span class="mock-btn">Uvozi prednastavitve</span></div>
    <div class="mock-row"><span class="mock-btn">Generiraj slike za prednastavitve</span></div>`)});

await shot('p02-b-proposed-panel', demo, {scale: 2, before: page => mockPanel(page, `
    <h4>Shranjena stanja</h4>
    <ul class="mock-list">
        <li><span>Privzeto stanje</span></li>
        <li data-on><span>parabola-4-deli</span><small>izbrano</small><b class="mock-more">⋯</b></li>
        <li><span>sinus-8-delov</span><b class="mock-more">⋯</b></li>
        <li><span>zgornja-vsota-prevec</span><b class="mock-more">⋯</b></li>
    </ul>
    <div class="mock-row" style="margin-top:0"><span class="mock-btn primary">Shrani trenutno stanje …</span></div>
    <p class="mock-note">Meni ⋯: Preimenuj · Prepiši s trenutnim stanjem · Izbriši</p>
    <hr>
    <h4>Varnostna kopija</h4>
    <p>Stanja so shranjena samo v tem brskalniku. Datoteka jih prenese v drug brskalnik ali računalnik.</p>
    <div class="mock-row" style="margin-top:0"><span class="mock-btn">Izvozi datoteko</span><span class="mock-btn">Uvozi datoteko</span></div>`)});

// ---------- L05: side botanicals on a chapter reading page ----------

for (const [name, opacity] of [['l05-a-as-elsewhere', '1'], ['l05-b-calmer', '0.5']]) {
await shot(name, `${base}/learn`, {width: 2560, height: 1300, before: async page => {
    await page.waitForSelector('.side-botanicals-root');
    await page.waitForTimeout(3500);
    const html = await page.evaluate(() => document.querySelector('.side-botanicals-root').outerHTML);
    // Client-side navigation keeps the stylesheet; the decoration is then re-inserted beside the chapter column.
    await page.locator('a[href="/bezeg-2.0/learn/bezier-curves"]').first().click();
    await page.waitForSelector('.chapter-layout');
    await page.waitForTimeout(1500);
    await page.evaluate(([html, opacity]) => {
        const holder = document.createElement('div');
        holder.innerHTML = html;
        const root = holder.firstElementChild;
        root.style.setProperty('--growth', '1');
        root.querySelectorAll('svg').forEach(svg => { svg.style.opacity = opacity; });
        // The layout grid spans the window; the visible column runs from the contents list to the article's edge.
        const column = {
            left: Math.min(...[...document.querySelectorAll('.chapter-layout nav ol, .chapter-article > *')].map(e => e.getBoundingClientRect().left)),
            right: Math.max(...[...document.querySelectorAll('.chapter-article > *')].map(e => e.getBoundingClientRect().right)),
        };
        const viewport = document.documentElement.clientWidth;
        root.querySelector('.side-botanicals-left')?.style.setProperty('width', `${column.left - 24}px`);
        root.querySelector('.side-botanicals-right')?.style.setProperty('width', `${viewport - column.right - 24}px`);
        const page = document.querySelector('.chapter-page');
        page.after(root);
        window.scrollTo(0, 700);
        const describe = element => { const s = getComputedStyle(element); const r = element.getBoundingClientRect(); return `${element.className?.baseVal ?? element.className} pos=${s.position} z=${s.zIndex} bg=${s.backgroundColor} op=${s.opacity} rect=${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`; };
        return [describe(page), describe(root), ...[...root.children].map(describe), `column=${Math.round(column.left)}..${Math.round(column.right)} viewport=${viewport}`];
    }, [html, opacity]).then(lines => console.log(lines.join('\n')));
}});
}

await browser.close();
