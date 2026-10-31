import React from 'react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import LookUnderneath, {SINGLE_CURVE_SAMPLES, jointLabelDirection, jointLabelPosition, singleCurvePath} from './LookUnderneath';
import {EXAMPLE_DRAWING, PLAYGROUND_STORAGE_KEY} from './DrawingPlayground';
import {Drawing, classifyJoint, evaluateBezier, jointIndices, segments, setAnchorType, singleCurveControlPoints} from './drawingModel';
import {setLanguage} from '../../localization';
import {appStorage} from '../../storage/appStorage';

const mount = (drawing: Drawing | null) => {
    if (drawing) appStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(drawing));
    return render(<LookUnderneath/>);
};
const all = (c: HTMLElement, sel: string) => Array.from(c.querySelectorAll(sel));
const setT = (v: number) => fireEvent.change(screen.getByRole('slider'), {target: {value: String(v)}});
const bt = (c: HTMLElement) => {
    const el = c.querySelector('[data-overlay-part="bt"]')!;
    return {x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy'))};
};
const jointLabels = (c: HTMLElement) => all(c, '[data-overlay="joins"] text').map(e => e.textContent);
const anchorEl = (c: HTMLElement, i: number) => c.querySelector(`[data-role="anchor"][data-index="${i}"]`)!;
const selectAnchor = (c: HTMLElement, i: number) => fireEvent.focus(anchorEl(c, i));
const clickSegment = (c: HTMLElement, i: number) => fireEvent.pointerDown(c.querySelector(`[data-role="segment"][data-index="${i}"]`)!, {pointerId: 1, button: 0, clientX: 5, clientY: 5});
const selectedPolygon = (c: HTMLElement) => all(c, '[data-overlay-part="polygon"]').findIndex(p => p.classList.contains('is-selected'));

beforeEach(() => { appStorage.removeItem(PLAYGROUND_STORAGE_KEY); });
afterEach(() => { cleanup(); act(() => setLanguage('sl')); vi.restoreAllMocks(); });

describe('control points overlay', () => {
    it('draws one polygon per segment and labels P0-P3 of the selected segment', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        const segs = segments(EXAMPLE_DRAWING);
        const polys = all(container, '[data-overlay-part="polygon"]');
        expect(polys).toHaveLength(segs.length);
        expect(polys.filter(p => p.classList.contains('is-selected'))).toHaveLength(1);
        expect(selectedPolygon(container)).toBe(0);
        expect(polys[0].getAttribute('points')).toBe(segs[0].map(p => `${p.x},${p.y}`).join(' '));
        expect(all(container, '.lu-point-label').map(e => e.textContent)).toEqual(['P0', 'P1', 'P2', 'P3']);
    });

    it('moves the highlight with the buttons and with a click on a segment, and clamps when segments shrink', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        fireEvent.click(screen.getByRole('button', {name: 'Naslednji odsek'}));
        expect(selectedPolygon(container)).toBe(1);
        clickSegment(container, 4);
        expect(selectedPolygon(container)).toBe(4);
        expect(screen.getByText('Odsek 5 od 6')).toBeTruthy();
        expect(all(container, '[data-role="anchor"]')).toHaveLength(6); // clicking a segment edits nothing
        clickSegment(container, 5);
        selectAnchor(container, 1);
        fireEvent.click(screen.getByRole('button', {name: /Izbriši točko|Delete point/}));
        expect(all(container, '[data-overlay-part="polygon"]')).toHaveLength(5);
        expect(selectedPolygon(container)).toBe(4);
        expect(screen.getByText('Odsek 5 od 5')).toBeTruthy();
    });

    it('switching the overlay off removes it', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        fireEvent.click(screen.getByRole('checkbox', {name: 'Kontrolne točke'}));
        expect(all(container, '[data-overlay-part="polygon"]')).toHaveLength(0);
        expect(all(container, '.lu-point-label')).toHaveLength(0);
    });
});

describe('De Casteljau overlay', () => {
    it('puts B(t) on P0, on the drawn segment and on P3', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        const seg = segments(EXAMPLE_DRAWING)[0];
        setT(0);
        expect(bt(container)).toEqual(seg[0]);
        setT(0.5);
        const mid = evaluateBezier(seg, 0.5);
        expect(Math.abs(bt(container).x - mid.x)).toBeLessThan(1e-9);
        expect(Math.abs(bt(container).y - mid.y)).toBeLessThan(1e-9);
        setT(1);
        expect(bt(container)).toEqual(seg[3]);
    });

    it('draws the construction rows for a cubic (two intermediate levels with 3 and 2 points)', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        const rows = all(container, '[data-overlay-part="row"]');
        expect(rows.map(r => r.getAttribute('points')!.split(' ').length)).toEqual([3, 2]);
    });

    it('follows the selected segment and an edit of the drawing', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        fireEvent.click(screen.getByRole('button', {name: 'Naslednji odsek'}));
        const expected = evaluateBezier(segments(EXAMPLE_DRAWING)[1], 0.5);
        expect(Math.abs(bt(container).x - expected.x)).toBeLessThan(1e-9);
        expect(Math.abs(bt(container).y - expected.y)).toBeLessThan(1e-9);
        // Editing the shared anchor 2 (end of segment 1) changes B(t) immediately.
        selectAnchor(container, 2);
        fireEvent.keyDown(anchorEl(container, 2), {key: 'ArrowDown'});
        expect(bt(container).y).not.toBeCloseTo(expected.y, 6);
    });

    it('is hidden when its switch is off', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        fireEvent.click(screen.getByRole('checkbox', {name: 'De Casteljaujeva konstrukcija'}));
        expect(container.querySelector('[data-overlay-part="bt"]')).toBeNull();
        expect(screen.queryByRole('slider')).toBeNull();
    });
});

describe('joins overlay', () => {
    it('labels every joint by classifyJoint and changes after an anchor type change', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        const expected = (d: Drawing) => jointIndices(d).map(i => classifyJoint(d, i));
        expect(jointLabels(container)).toEqual(expected(EXAMPLE_DRAWING));
        expect(expected(EXAMPLE_DRAWING)).toContain('C0');
        selectAnchor(container, 3); // the notch corner
        fireEvent.click(screen.getByRole('button', {name: 'Gladka (C1)'}));
        const after = setAnchorType(EXAMPLE_DRAWING, 3, 'smooth-mirrored');
        expect(expected(after)).not.toEqual(expected(EXAMPLE_DRAWING));
        expect(jointLabels(container)).toEqual(expected(after));
    });

    it('labels only interior anchors of an open path', () => {
        const open: Drawing = {closed: false, anchors: EXAMPLE_DRAWING.anchors.slice(0, 4)};
        const {container} = mount(open);
        expect(jointLabels(container)).toEqual(jointIndices(open).map(i => classifyJoint(open, i)));
        expect(jointLabels(container)).toHaveLength(2);
    });
});

describe('one curve through all the points', () => {
    it('draws the degree-3k curve and states the degree', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        const path = container.querySelector('[data-overlay-part="single-curve"]')!;
        expect(path.getAttribute('d')).toBe(singleCurvePath(EXAMPLE_DRAWING));
        const pts = singleCurveControlPoints(EXAMPLE_DRAWING);
        expect(pts).toHaveLength(3 * 6 + 1);
        expect((path.getAttribute('d')!.match(/[ML]/g) ?? []).length).toBe(SINGLE_CURVE_SAMPLES + 1);
        expect(container.querySelector('[data-overlay-part="degree"]')!.textContent).toBe('Ena Bézierjeva krivulja stopnje 18');
        const last = evaluateBezier(pts, 1);
        expect(path.getAttribute('d')!.endsWith(`L ${Math.round(last.x * 1e3) / 1e3} ${Math.round(last.y * 1e3) / 1e3}`)).toBe(true);
    });

    it('updates the degree after deleting an anchor', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        selectAnchor(container, 1);
        fireEvent.click(screen.getByRole('button', {name: /Izbriši točko/}));
        expect(container.querySelector('[data-overlay-part="degree"]')!.textContent).toBe('Ena Bézierjeva krivulja stopnje 15');
    });
});

describe('joint label placement', () => {
    // Hand-computed: a closed square 0..200 has its centroid at (100, 100), so each corner label points diagonally outward.
    const corner = (x: number, y: number) => ({position: {x, y}, handleIn: {x, y}, handleOut: {x, y}, type: 'corner' as const});
    const SQUARE: Drawing = {closed: true, anchors: [corner(100, 100), corner(300, 100), corner(300, 300), corner(100, 300)]};
    const r = Math.SQRT1_2;

    it('points away from the centroid, and straight down for an anchor at the centroid', () => {
        expect(jointLabelDirection(SQUARE, 0).x).toBeCloseTo(-r, 12);
        expect(jointLabelDirection(SQUARE, 0).y).toBeCloseTo(-r, 12);
        expect(jointLabelDirection(SQUARE, 2).x).toBeCloseTo(r, 12);
        expect(jointLabelDirection(SQUARE, 2).y).toBeCloseTo(r, 12);
        expect(jointLabelDirection({closed: false, anchors: [corner(50, 50)]}, 0)).toEqual({x: 0, y: 1});
    });

    it('flips inward off the degree caption and stays inside the 1000x625 view box (size 16: distance 26, half box 12.8 x 9.6)', () => {
        const caption = {left: 16, top: 16, right: 300, bottom: 36.8};
        expect(jointLabelPosition({x: 100, y: 60}, {x: 0, y: -1}, 16, null)).toEqual({x: 100, y: 34});
        expect(jointLabelPosition({x: 100, y: 60}, {x: 0, y: -1}, 16, caption)).toEqual({x: 100, y: 86});
        expect(jointLabelPosition({x: 500, y: 620}, {x: 0, y: 1}, 16, null)).toEqual({x: 500, y: 615.4});
        expect(jointLabelPosition({x: 995, y: 300}, {x: 1, y: 0}, 16, null)).toEqual({x: 987.2, y: 300});
    });

    it('renders each joint label centred outward of its anchor, clear of the anchor dot', () => {
        const {container} = mount(SQUARE);
        const labels = all(container, '[data-overlay="joins"] text');
        expect(labels).toHaveLength(4);
        const first = labels[0];
        const size = Number(first.getAttribute('font-size'));
        expect(size).toBeGreaterThan(0);
        expect(first.getAttribute('text-anchor')).toBe('middle');
        expect(Number(first.getAttribute('x'))).toBeCloseTo(100 - r * 26 * size / 16, 9);
        expect(Number(first.getAttribute('y'))).toBeCloseTo(100 - r * 26 * size / 16, 9);
    });
});

describe('degenerate drawings and language', () => {
    it('renders without segments and without errors for an empty and a one-anchor drawing', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        const {container, unmount} = mount(null);
        expect(all(container, '[data-role="anchor"]')).toHaveLength(EXAMPLE_DRAWING.anchors.length); // never empty on a first visit
        fireEvent.click(screen.getByRole('button', {name: 'Počisti'}));
        expect(all(container, '[data-overlay-part]')).toHaveLength(0);
        expect(screen.getByText('Še ni odsekov: dodaj vsaj dve točki')).toBeTruthy();
        expect(screen.queryByRole('slider')).toBeNull();
        unmount();
        const one = mount({closed: false, anchors: [EXAMPLE_DRAWING.anchors[0]]});
        expect(all(one.container, '[data-overlay-part]')).toHaveLength(0);
        expect(err).not.toHaveBeenCalled();
    });

    it('switches overlay text language live', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        expect(screen.getByRole('checkbox', {name: 'Stiki'})).toBeTruthy();
        act(() => setLanguage('en'));
        expect(screen.getByRole('checkbox', {name: 'Joins'})).toBeTruthy();
        expect(container.querySelector('[data-overlay-part="degree"]')!.textContent).toBe('One Bézier curve of degree 18');
        expect(screen.getByText('Segment 1 of 6')).toBeTruthy();
    });
});

// Hand-computed expectations (no model functions): the cubic P0=(0,0) P1=(0,80) P2=(160,160) P3=(240,0).
const anchor = (x: number, y: number, hin: [number, number], hout: [number, number], type: 'corner' | 'smooth-mirrored' = 'corner') =>
    ({position: {x, y}, handleIn: {x: hin[0], y: hin[1]}, handleOut: {x: hout[0], y: hout[1]}, type});
const CUBIC: Drawing = {closed: false, anchors: [anchor(0, 0, [0, 0], [0, 80]), anchor(240, 0, [160, 160], [240, 0])]};
const triangle = (closed: boolean): Drawing => ({
    closed,
    anchors: [anchor(100, 100, [90, 100], [110, 100], 'smooth-mirrored'), anchor(300, 100, [290, 100], [300, 110]), anchor(300, 300, [290, 300], [300, 310])],
});

describe('hand-computed values', () => {
    it('B(1/2) = (P0+3P1+3P2+P3)/8 = (90,90) and the rows hold the midpoints', () => {
        const {container} = mount(CUBIC);
        expect(bt(container)).toEqual({x: 90, y: 90});
        const rows = all(container, '[data-overlay-part="row"]').map(r => r.getAttribute('points'));
        expect(rows).toEqual(['0,40 80,120 200,80', '40,80 140,100']);
    });

    it('samples the one curve at its start, middle and end', () => {
        const {container} = mount(CUBIC);
        const cmds = container.querySelector('[data-overlay-part="single-curve"]')!.getAttribute('d')!.split(/(?=[ML])/).map(c => c.trim());
        expect(cmds).toHaveLength(401);
        expect(cmds[0]).toBe('M 0 0');
        expect(cmds[200]).toBe('L 90 90');
        expect(cmds[400]).toBe('L 240 0');
    });

    it('places the P labels beside their points', () => {
        const {container} = mount(CUBIC);
        const pts = [[0, 0], [0, 80], [160, 160], [240, 0]];
        const labels = all(container, '.lu-point-label');
        expect(labels).toHaveLength(4);
        labels.forEach((l, k) => {
            const fs = Number(l.getAttribute('font-size'));
            expect(Number(l.getAttribute('x'))).toBeCloseTo(pts[k][0] + 10 * fs / 16, 9);
            expect(Number(l.getAttribute('y'))).toBeCloseTo(pts[k][1] - 10 * fs / 16, 9);
        });
    });

    it('closed drawing: 3 polygons including the closing one, joint labels at the anchors, degree 9', () => {
        const {container} = mount(triangle(true));
        const polys = all(container, '[data-overlay-part="polygon"]');
        expect(polys).toHaveLength(3);
        expect(polys[2].getAttribute('points')!.endsWith(' 100,100')).toBe(true);
        const j = all(container, '[data-overlay="joins"] text');
        expect(j.map(e => e.textContent)).toEqual(['C1', 'C0', 'C0']);
        const fs = Number(j[0].getAttribute('font-size'));
        // At the anchor (100, 100), offset outward by 26/16 of the font size (direction: the joint label placement tests).
        expect(Math.hypot(Number(j[0].getAttribute('x')) - 100, Number(j[0].getAttribute('y')) - 100)).toBeCloseTo(26 * fs / 16, 9);
        expect(container.querySelector('[data-lu="degree"]')!.textContent).toBe('Ena Bézierjeva krivulja stopnje 9');
    });

    it('open drawing: 2 polygons, 1 joint label, degree 6', () => {
        const {container} = mount(triangle(false));
        expect(all(container, '[data-overlay-part="polygon"]')).toHaveLength(2);
        expect(all(container, '[data-overlay="joins"] text')).toHaveLength(1);
        expect(container.querySelector('[data-lu="degree"]')!.textContent).toBe('Ena Bézierjeva krivulja stopnje 6');
    });
});

describe('controls area', () => {
    it('has a single live region, visible segment and degree text, and a joins legend only while Joins is on', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        expect(screen.getAllByRole('status')).toHaveLength(1);
        expect(container.querySelector('[data-lu="segment"]')!.textContent).toBe('Odsek 1 od 6');
        expect(container.querySelector('[data-lu="degree"]')!.textContent).toBe('Ena Bézierjeva krivulja stopnje 18');
        expect(container.querySelector('[data-lu="legend"]')!.textContent).toContain('G1: smer se nadaljuje');
        fireEvent.click(screen.getByRole('checkbox', {name: 'Stiki'}));
        expect(container.querySelector('[data-lu="legend"]')).toBeNull();
        act(() => setLanguage('en'));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Joins'}));
        expect(container.querySelector('[data-lu="legend"]')!.textContent).toContain('G1: the direction continues');
    });

    it('gives the one curve its own token and a dash (CSS)', () => {
        const css = readFileSync(resolve(__dirname, 'DrawingPlayground.css'), 'utf8');
        const rule = (name: string) => css.match(new RegExp('\\.' + name + '\\s*\\{[^}]*\\}'))![0];
        const stroke = (name: string) => rule(name).match(/stroke:\s*(var\([^)]+\))/)![1];
        expect(rule('lu-single')).toContain('stroke-dasharray');
        const tokens = [stroke('lu-single'), stroke('lu-level-1'), stroke('lu-level-2')];
        expect(new Set(tokens).size).toBe(3);
        expect(tokens).not.toContain('var(--bezeg-shell-ink)');
        expect(rule('lu-bt')).toContain('--bezeg-shell-ink');
    });

    it('starts previous/next from the clamped segment after the drawing shrank and grew again', () => {
        const {container} = mount(EXAMPLE_DRAWING);
        clickSegment(container, 5);
        selectAnchor(container, 1);
        fireEvent.click(screen.getByRole('button', {name: 'Izbriši točko'}));
        expect(container.querySelector('[data-lu="segment"]')!.textContent).toBe('Odsek 5 od 5');
        fireEvent.click(screen.getByRole('button', {name: 'Razveljavi'}));
        expect(container.querySelector('[data-lu="segment"]')!.textContent).toBe('Odsek 5 od 6');
        fireEvent.click(screen.getByRole('button', {name: 'Naslednji odsek'}));
        expect(container.querySelector('[data-lu="segment"]')!.textContent).toBe('Odsek 6 od 6');
    });
});
