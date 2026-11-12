import React from 'react';
import {vi} from 'vitest';
import {render} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import App from '../App';

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
    expect(svgs()[0].querySelectorAll('g.side-botanicals-branch')).toHaveLength(4);
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
