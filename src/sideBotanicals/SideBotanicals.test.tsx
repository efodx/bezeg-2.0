import React from 'react';
import {vi} from 'vitest';
import {render} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import App from '../App';
import {fitToGutter} from './SideBotanicals';
import {ELDER_SETTINGS} from './elderGeometry';

function setViewport(width: number, matches: boolean) {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: width});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 1440});
    window.matchMedia = ((query: string) => ({
        matches, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
}

function renderAt(path: string) {
    return render(<MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/bezeg-2.0" element={<App/>}>
                <Route index element={<div/>}/>
                <Route path="demonstrations" element={<div/>}/>
                <Route path="learn" element={<div/>}/>
                <Route path="learn/bezier-curves" element={<div/>}/>
                <Route path="demonstrations/:id" element={<div/>}/>
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
    expect(wide.size).toBeCloseTo(ELDER_SETTINGS.size);
    expect(narrow.size).toBeCloseTo(ELDER_SETTINGS.size * .4);
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
