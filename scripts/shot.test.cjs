'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {MAX_SHEET_SIDE, fileName, groupSheets, joinUrl, parseArgs, sheetHtml, sheetLayout} = require('./shot.cjs');

test('parseArgs applies defaults and collects routes', () => {
    const {opts} = parseArgs(['--base', 'http://x/app', '#/a', '#/b?c=1']);
    assert.deepEqual(opts, {base: 'http://x/app', width: 1366, height: 768, selector: '', out: '.command-logs/shots', wait: 500, sheet: false, routes: ['#/a', '#/b?c=1']});
});

test('parseArgs reads every option', () => {
    const {opts} = parseArgs(['--base', 'b', '--width', '310', '--height', '900', '--selector', '.p', '--out', 'o', '--wait', '0', '--sheet', 'r']);
    assert.equal(opts.width, 310);
    assert.equal(opts.height, 900);
    assert.equal(opts.selector, '.p');
    assert.equal(opts.out, 'o');
    assert.equal(opts.wait, 0);
    assert.equal(opts.sheet, true);
});

test('parseArgs rejects unknown options, missing base, no route and bad numbers', () => {
    assert.match(parseArgs(['--base', 'b', '--nope', 'r']).error, /unknown option --nope/);
    assert.match(parseArgs(['r']).error, /missing --base/);
    assert.match(parseArgs(['--base', 'b']).error, /no route/);
    assert.match(parseArgs(['--base', 'b', '--width', 'abc', 'r']).error, /whole number/);
    assert.match(parseArgs(['--base', 'b', '--selector']).error, /needs a value/);
});

test('joinUrl uses exactly one slash', () => {
    assert.equal(joinUrl('http://h/app', 'x?y=1'), 'http://h/app/x?y=1');
    assert.equal(joinUrl('http://h/app/', '/x'), 'http://h/app/x');
    assert.equal(joinUrl('http://h/app//', '//x'), 'http://h/app/x');
});

test('fileName is filesystem safe, includes width and does not collide', () => {
    const a = fileName('lesson/a?x=1&y=2', 310);
    assert.match(a, /^[A-Za-z0-9._-]+$/);
    assert.match(a, /-w310\.png$/);
    assert.notEqual(fileName('a/b', 310), fileName('a-b', 310));
    assert.notEqual(fileName('a', 310), fileName('a', 1366));
    assert.equal(fileName('a', 310), fileName('a', 310));
    assert.match(fileName('', 100), /^root-/);
});

test('groupSheets caps tiles per sheet at 8', () => {
    const items = Array.from({length: 17}, (_, i) => i);
    assert.deepEqual(groupSheets(items).map((g) => g.length), [8, 8, 1]);
    assert.deepEqual(groupSheets([]), []);
});

const tile = (width, height, route = 'r') => ({route, width, height, src: 'file:///t.png'});

test('sheetLayout never upscales small tiles and sizes the sheet to them', () => {
    const layout = sheetLayout([tile(310, 211), tile(310, 211)]);
    assert.equal(layout.scale, 1);
    assert.equal(layout.cols, 2);
    assert.equal(layout.width, 620);
    assert.ok(layout.height < 300);
});

test('sheetLayout keeps large or many tiles within the longest-side limit', () => {
    for (const items of [[tile(1366, 768)], Array.from({length: 8}, () => tile(1366, 768)), Array.from({length: 8}, () => tile(310, 1300)), [tile(5000, 100), tile(100, 5000)]]) {
        const layout = sheetLayout(items);
        assert.ok(layout.width <= MAX_SHEET_SIDE && layout.height <= MAX_SHEET_SIDE, JSON.stringify(layout));
        assert.ok(layout.scale <= 1 && layout.cols * layout.rows >= items.length);
    }
    assert.ok(sheetLayout([tile(2000, 1000)]).scale < 1);
});

test('sheetLayout leaves room for a caption under every tile', () => {
    const layout = sheetLayout([tile(310, 1136), tile(310, 211)]);
    assert.ok(layout.cellH >= Math.floor(1136 * layout.scale) + 16);
});

test('sheetHtml keeps a tall tile whole with its aspect ratio', () => {
    const html = sheetHtml([tile(310, 1136, 'tall'), tile(310, 211, 'short')]);
    const {scale} = sheetLayout([tile(310, 1136), tile(310, 211)]);
    assert.ok(html.includes(`width="${Math.floor(310 * scale)}" height="${Math.floor(1136 * scale)}"`));
    const tall = sheetLayout([tile(310, 3000)]);
    assert.ok(tall.scale < 0.6);
    assert.ok(sheetHtml([tile(310, 3000)]).includes(`height="${Math.floor(3000 * tall.scale)}"`));
});

test('sheetHtml captions each tile with its escaped route and names the empty route', () => {
    const html = sheetHtml([{...tile(10, 10), route: '#/a?x=1&y=<2>'}, {...tile(10, 10), route: ''}]);
    assert.ok(html.includes('<figcaption>#/a?x=1&amp;y=&lt;2&gt;</figcaption>'));
    assert.ok(html.includes('<figcaption>(root)</figcaption>'));
    assert.equal(html.split('<figure>').length - 1, 2);
});
