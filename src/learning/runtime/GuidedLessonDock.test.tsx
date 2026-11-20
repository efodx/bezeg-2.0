import React, {act} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import type {Mock} from 'vitest';
import {setLanguage} from '../../localization';
import type {LessonDefinition, LessonGraphCapabilities} from '../model';
import {fitFormulaRows, GuidedLesson} from './GuidedLesson';

beforeEach(() => {
    (window as Window & {MathJax?: {startup: {promise: Promise<void>}; typesetClear: Mock; typesetPromise: Mock}}).MathJax = {
        startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise: vi.fn().mockResolvedValue(undefined),
    };
    setLanguage('en');
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    act(() => setLanguage('sl'));
});

const lesson: LessonDefinition = {
    id: 'dock-test', demonstrationId: 'bezier', title: {sl: 'Vodena pot', en: 'Guided path'}, summary: {sl: 'Povzetek', en: 'Summary'},
    steps: [{id: 'first', title: {sl: 'Prvi korak', en: 'First step'}, body: {sl: 'Razlaga', en: 'Explanation'}}],
};

function capabilities(): LessonGraphCapabilities {
    return {captureState: () => ({version: 1, value: 'before'}), restoreState: vi.fn(), apply: vi.fn()};
}

const section = () => document.querySelector('section.guided-lesson') as HTMLElement;

describe('lesson card docking', () => {
    test('the reading section sits outside the layer and starts docked', () => {
        render(<GuidedLesson lesson={lesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        expect(section()).not.toBeNull();
        expect(section().closest('.guided-lesson-layer')).toBeNull();
        expect(document.querySelector('.guided-lesson-layer')).not.toBeNull();
        expect(section()).toHaveClass('guided-lesson-docked');
    });

    test('moving the card with the grip undocks it', () => {
        // jsdom has no layout: give the layer and card boxes that follow the card's translate offset.
        const previousSize = {width: window.innerWidth, height: window.innerHeight};
        Object.assign(window, {innerWidth: 1000, innerHeight: 600});
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
            if (this.classList.contains('guided-lesson-layer')) return DOMRect.fromRect({x: 0, y: 0, width: 1000, height: 600});
            if (this.classList.contains('guided-lesson')) {
                const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec((this as HTMLElement).style.transform);
                return DOMRect.fromRect({x: 100 + Number(match?.[1] ?? 0), y: 20 + Number(match?.[2] ?? 0), width: 500, height: 300});
            }
            return DOMRect.fromRect();
        });
        render(<GuidedLesson lesson={lesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        const grip = screen.getByRole('button', {name: 'Move instructions'});
        fireEvent.keyDown(grip, {key: 'ArrowLeft', shiftKey: true});
        fireEvent.keyDown(grip, {key: 'ArrowDown', shiftKey: true});
        expect(section().style.transform).not.toBe('');
        expect(section()).not.toHaveClass('guided-lesson-docked');
        Object.assign(window, previousSize);
    });

    test('shows the kind label when the page title is the lesson title', () => {
        render(<GuidedLesson lesson={lesson} capabilities={capabilities()} onClose={vi.fn()} visiblePageTitle="Guided path"/>);
        const kind = section().querySelector('.guided-lesson-kind');
        expect(kind).toHaveClass('guided-lesson-title');
        expect(kind).toHaveTextContent('Guided example');
        expect(document.getElementById('guided-lesson-title')).toBeNull();
    });

    test('shows the lesson title when the page title differs', () => {
        render(<GuidedLesson lesson={lesson} capabilities={capabilities()} onClose={vi.fn()} visiblePageTitle="Something else"/>);
        expect(document.querySelector('#guided-lesson-title')).toHaveTextContent('Guided path');
        expect(document.querySelector('.guided-lesson-kind')).toBeNull();
    });
});

describe('fitFormulaRows', () => {
    // A row whose content is `natural` px wide at 100 % and shrinks in proportion to its font size.
    function row(natural: number, client: number, display: boolean, fontSize = '') {
        const el = document.createElement('div');
        el.className = 'guided-lesson-notation';
        if (display) {
            const mjx = document.createElement('mjx-container');
            mjx.setAttribute('display', 'true');
            el.appendChild(mjx);
        }
        el.style.fontSize = fontSize;
        Object.defineProperty(el, 'clientWidth', {get: () => client});
        Object.defineProperty(el, 'scrollWidth', {
            get: () => {
                const pct = el.style.fontSize ? parseFloat(el.style.fontSize) : 100;
                return Math.max(client, natural * pct / 100);
            },
        });
        return el;
    }

    function fit(...rows: HTMLElement[]) {
        const panel = document.createElement('div');
        rows.forEach(r => panel.appendChild(r));
        fitFormulaRows(panel);
    }

    test('shrinks an overflowing display row within 72-100 %', () => {
        const el = row(400, 300, true);
        fit(el);
        const pct = parseFloat(el.style.fontSize);
        expect(pct).toBeLessThan(100);
        expect(pct).toBeGreaterThanOrEqual(72);
        expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);
    });

    test('stops at 72 % when the row needs less', () => {
        const el = row(1000, 300, true);
        fit(el);
        expect(el.style.fontSize).toBe('72%');
    });

    test('leaves fitting display rows and overflowing prose rows alone', () => {
        const fitting = row(250, 300, true);
        const prose = row(900, 300, false);
        fit(fitting, prose);
        expect(fitting.style.fontSize).toBe('');
        expect(prose.style.fontSize).toBe('');
    });

    test('clears a stale font size on a row that now fits', () => {
        const el = row(250, 300, true, '80%');
        fit(el);
        expect(el.style.fontSize).toBe('');
    });
});
