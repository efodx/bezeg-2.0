import React from 'react';
import {vi} from 'vitest';
import {render} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import App from '../App';
import {fitToGutter} from './SideBotanicals';
import {gutterWidths} from './gutters';
import {ELDER_SETTINGS} from './elderGeometry';

function setViewport(width: number, matches: boolean) {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: width});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 1440});
    window.matchMedia = ((query: string) => ({
        matches, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
}

/** jsdom has no layout: the marked column reports a centred box of this width (px), or the given edges. */
let column: number | {left: number; right: number} = 1100;
beforeEach(() => {
    column = 1100;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        if (!this.hasAttribute('data-content-column')) return new DOMRect();
        const edges = typeof column === 'number' ? {left: (window.innerWidth - column) / 2, right: (window.innerWidth + column) / 2} : column;
        return new DOMRect(edges.left, 0, edges.right - edges.left, 900);
    });
});
afterEach(() => vi.restoreAllMocks());

function renderAt(path: string) {
    const page = <main data-content-column/>;
    return render(<MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/bezeg-2.0" element={<App/>}>
                <Route index element={page}/>
                <Route path="demonstrations" element={page}/>
                <Route path="learn" element={page}/>
                <Route path="learn/bezier-curves" element={page}/>
                <Route path="demonstrations/:id" element={page}/>
            </Route>
        </Routes>
    </MemoryRouter>);
}

const svgs = () => document.querySelectorAll('svg.side-botanicals');

test.each(['/bezeg-2.0', '/bezeg-2.0/', '/bezeg-2.0/demonstrations', '/bezeg-2.0/learn'])('renders both gutters at %s on a wide viewport', (path) => {
    setViewport(3440, true);
    renderAt(path);
    expect(svgs()).toHaveLength(2);
    expect(svgs()[0]).toHaveAttribute('aria-hidden', 'true');
    expect(svgs()[0].querySelectorAll('g.side-botanicals-branch').length).toBeGreaterThanOrEqual(1);
});

test.each([3918, 3440, 2048])('a %ipx viewport keeps the owner density: three branches with four heads each', (width) => {
    setViewport(width, true);
    renderAt('/bezeg-2.0/demonstrations');
    expect(svgs()[0].querySelectorAll('g.side-botanicals-branch')).toHaveLength(3);
    expect(svgs()[0].querySelectorAll('g.side-botanicals-head')).toHaveLength(3 * 4);
    expect(svgs()[0].querySelectorAll('g.side-botanicals-florets')).toHaveLength(3 * 4 * 4);
});

test('fitToGutter keeps counts fixed and scales plant size with the gutter', () => {
    const wide = fitToGutter(ELDER_SETTINGS, 1290), narrow = fitToGutter(ELDER_SETTINGS, 516);
    expect(narrow.size).toBeCloseTo(ELDER_SETTINGS.size * .4); // the 2048px look
    expect(wide.size / narrow.size).toBeCloseTo(Math.sqrt(1290 / 516)); // grows with the square root of the gutter
    expect(narrow.thick).toBeLessThan(wide.thick);
    for (const s of [wide, narrow]) expect([s.left, s.right, s.heads]).toEqual([3, 3, 4]);
    expect(fitToGutter({...ELDER_SETTINGS, left: 2, heads: 3}, 400)).toMatchObject({left: 2, heads: 3});
    expect(fitToGutter({...ELDER_SETTINGS, right: 0}, 400).right).toBe(0);
});

test('renders nothing on a narrow viewport', () => {
    setViewport(1280, false);
    renderAt('/bezeg-2.0');
    expect(svgs()).toHaveLength(0);
});

test.each(['/bezeg-2.0/learn/bezier-curves', '/bezeg-2.0/demonstrations/anything'])('renders nothing on %s', (path) => {
    setViewport(3440, true);
    renderAt(path);
    expect(svgs()).toHaveLength(0);
});

test('leaves and heads carry a growth threshold below 1 and the stem does not', () => {
    setViewport(3440, true);
    renderAt('/bezeg-2.0/learn');
    const branch = svgs()[0].querySelector('g.side-botanicals-branch')!;
    expect(branch.querySelector(':scope > path')).not.toHaveClass('side-botanicals-grow');
    const growing = [...svgs()[0].querySelectorAll<SVGElement>('.side-botanicals-grow')];
    expect(growing.length).toBe(3 * (ELDER_SETTINGS.leaves * 2 + 4));
    for (const part of growing) {
        const at = Number(part.style.getPropertyValue('--at'));
        expect(at).toBeGreaterThan(0);
        expect(at).toBeLessThanOrEqual(.85); // leaves room for the fade-in before growth reaches 1
    }
});

test('reduced motion writes full growth on the decoration root before paint', () => {
    setViewport(3440, true); // the matchMedia stub also reports reduced motion
    renderAt('/bezeg-2.0/learn');
    expect(document.querySelector<HTMLElement>('.side-botanicals-root')!.style.getPropertyValue('--growth')).toBe('1');
});

test('each gutter is the space beside the column less a 24px margin, rounded down', () => {
    expect(gutterWidths({left: 1170, right: 2270}, 3440)).toEqual({left: 1146, right: 1146});
    expect(gutterWidths({left: 400.6, right: 1500}, 2400)).toEqual({left: 376, right: 876}); // sides are independent
    expect(gutterWidths({left: 123.9, right: 1800}, 1920)).toEqual({left: 0, right: 0}); // 99px and 96px: too narrow
    expect(gutterWidths({left: 124, right: 1796}, 1920)).toEqual({left: 100, right: 100});
    expect(gutterWidths({left: -20, right: 5000}, 3440)).toEqual({left: 0, right: 0}); // column wider than the viewport
});

test('the layers are sized from the measured column, each side on its own', () => {
    setViewport(3440, true);
    column = {left: 900, right: 2700};
    renderAt('/bezeg-2.0/learn');
    expect([...svgs()].map((svg) => (svg as SVGElement).style.width)).toEqual(['876px', '716px']);
});

test('a side whose gutter is too narrow gets no layer', () => {
    setViewport(3440, true);
    column = {left: 80, right: 2400};
    renderAt('/bezeg-2.0/learn');
    expect(svgs()).toHaveLength(1);
    expect(svgs()[0]).toHaveClass('side-botanicals-right');
});

test('a page without a marked column gets no decoration until one arrives', async () => {
    setViewport(3440, true);
    const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0']}>
        <Routes><Route path="/bezeg-2.0" element={<App/>}><Route index element={<div id="late"/>}/></Route></Routes>
    </MemoryRouter>);
    expect(svgs()).toHaveLength(0);
    container.querySelector('#late')!.setAttribute('data-content-column', '');
    container.querySelector('#late')!.appendChild(document.createElement('p')); // a child-list change, as when a page loads
    await vi.waitFor(() => expect(svgs()).toHaveLength(2));
});
