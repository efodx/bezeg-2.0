import {act} from '@testing-library/react';
import {compgeoGuidedLessons, HULL_TRACE_STEPS} from './compgeoGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import type {LessonAction} from '../model';
import type {AnimationScheduler} from '../runtime/animation';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {HullTraceGraph} from '../../graphs/compgeo/HullTraceGraph';
import {hullPredicateTotals} from '../../graphs/compgeo/hullTraceRun';
import {orientValue} from '../../compgeo/predicates';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = () => getLessonForDemonstration('convex-hull')!;
const sceneOf = (stepId: string): LessonAction[] => lesson().steps.find(step => step.id === stepId)!.scene!.actions as LessonAction[];
const part = (name: string) => document.querySelector(`[data-hull-trace="${name}"]`)?.textContent;
const STEPS = ['hull-slow-intro', 'hull-slow-predict', 'hull-slow-reveal', 'hull-monotone-chain', 'hull-gift-wrapping', 'hull-counts', 'hull-explore'];
const NEXT: LessonAction = {kind: 'animation', animationId: 'algorithm-trace', command: 'next-step'};
const PLAY: LessonAction = {kind: 'animation', animationId: 'algorithm-trace', command: 'play'};

/** A mounted hull graph on a manual scheduler; `pending()` counts the scheduler callbacks that would still fire. */
function mountHull() {
    let nextHandle = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => { const handle = nextHandle++; callbacks.set(handle, callback); return handle; },
        cancel: handle => { callbacks.delete(handle); },
    };
    const graph = new HullTraceGraph({}, scheduler);
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities, pending: () => callbacks.size,
        /** Applies the scene of a step the way a lesson session does: restore the checkpoint, then every action, in one synchronous act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneOf(stepId)) capabilities.apply(action);
        }),
        press: (count = 1) => act(() => { for (let i = 0; i < count; i++) capabilities.apply(NEXT); }),
    };
}

test('the seven scenes show the algorithm, step, tests so far, accepted edges and overlays the text relies on, and never play', () => {
    const h = mountHull();
    try {
        const seen = STEPS.map(stepId => {
            h.scene(stepId);
            const run = h.graph.run();
            return [h.graph.algorithm, h.graph.step, run.event(h.graph.step)?.predicateCount, run.view(h.graph.step).accepted.length,
                h.graph.overlayShown('trace'), h.graph.overlayShown('hull'), h.graph.isPlaying, h.pending()] as const;
        });
        expect(seen).toEqual([
            ['slow-edge-test', 0, 7, 0, true, true, false, 0],
            ['slow-edge-test', 0, 7, 0, false, false, false, 0],
            ['slow-edge-test', 73, 504, 5, true, true, false, 0],
            ['monotone-chain', 5, 2, 1, true, true, false, 0],
            ['gift-wrapping', 7, 7, 1, true, true, false, 0],
            ['gift-wrapping', 41, 35, 1, true, true, false, 0],
            ['monotone-chain', 0, 0, 0, true, true, false, 0],
        ]);
        expect(HULL_TRACE_STEPS).toEqual({popTest: 5, collinearTest: 11, slowEnd: 73, wrapFirst: 7, wrapEnd: 41});
    } finally {
        h.mounted.view.unmount();
    }
});

test('slow test: 504 tests and the 5-vertex hull; gift wrapping: 35; the counts row lists 23, 504 and 35', () => {
    const h = mountHull();
    try {
        h.scene('hull-slow-reveal');
        expect(h.graph.run().length).toBe(HULL_TRACE_STEPS.slowEnd + 1);
        expect(h.graph.run().view(h.graph.step).hull).toEqual([5, 2, 1, 3, 4]);
        expect(part('count')).toContain('504');
        expect(hullPredicateTotals(h.graph.model.points)).toEqual({'slow-edge-test': 504, 'monotone-chain': 23, 'gift-wrapping': 35});
        h.scene('hull-counts');
        expect(h.graph.run().length).toBe(HULL_TRACE_STEPS.wrapEnd + 1);
        expect(h.graph.run().view(h.graph.step).hull).toEqual([5, 2, 1, 3, 4]);
        expect(part('count')).toContain('35');
        const rows = [...document.querySelectorAll('[data-hull-trace="totals"] li')].map(li => li.textContent?.split(': ').pop());
        expect(rows).toEqual(['23', '504', '35']);
    } finally {
        h.mounted.view.unmount();
    }
});

test('monotone chain: -2 at (2, 0) removes (1, 1), then 0 at (2, 5) removes (2, 2); the worked examples equal the orientation values', () => {
    const h = mountHull();
    try {
        h.scene('hull-monotone-chain');
        expect(part('detail')).toBe('Orientacija trojice = −2; preizkušana točka P8 (2, 0)');
        h.press();
        expect(h.graph.run().event(h.graph.step)?.note).toBe('reject-pop');
        expect(h.graph.run().view(h.graph.step).accepted[0]).toEqual([5, 2]);
        h.press(HULL_TRACE_STEPS.collinearTest - HULL_TRACE_STEPS.popTest - 1);
        expect(part('detail')).toBe('Orientacija trojice = 0; preizkušana točka P5 (2, 5)');
        expect(h.graph.run().event(h.graph.step)?.note).toBe('test-collinear');
        h.press();
        expect(h.graph.run().event(h.graph.step)?.note).toBe('reject-pop');
        const p = (x: number, y: number) => ({x, y});
        const example = (id: string) => compgeoGuidedLessons.find(l => l.demonstrationId === 'convex-hull')!.workedExamples.find(e => e.id === id)!;
        expect(example('hull-pop-example').resultLatex).toBe(`D=${orientValue(p(0, 0), p(1, 1), p(2, 0))}`);
        expect(example('hull-collinear-example').resultLatex).toBe(`D=${orientValue(p(2, 0), p(2, 2), p(2, 5))}`);
        expect(example('hull-count-example').calculationLatex).toContain('9\\cdot8\\cdot7=504');
        expect(example('hull-count-example').calculationLatex).toContain('5\\cdot7=35');
    } finally {
        h.mounted.view.unmount();
    }
});

test('gift wrapping: the first wrap is accepted after 7 tests and the whole run has 5 wraps', () => {
    const h = mountHull();
    try {
        h.scene('hull-gift-wrapping');
        expect(h.graph.run().event(h.graph.step)?.note).toBe('accept-wrap');
        expect(h.graph.run().view(h.graph.step).accepted).toEqual([[5, 2]]);
        const run = h.graph.run();
        expect(Array.from({length: run.length}, (_, i) => run.event(i)?.kind).filter(kind => kind === 'accept')).toHaveLength(5);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the quoted numbers appear in the step text of both languages', () => {
    const quoted: Record<string, readonly string[]> = {
        'hull-slow-intro': ['=72', '\\(7\\)'], 'hull-slow-reveal': ['\\(5\\)', '504'], 'hull-monotone-chain': ['\\(-2\\)', '(2,0)', '(2,5)', '\\(0\\)'],
        'hull-gift-wrapping': ['\\(7\\)', '(-1,3)'], 'hull-counts': ['\\(35\\)', '\\(504\\)', '\\(23\\)'],
    };
    for (const [stepId, tokens] of Object.entries(quoted)) {
        const step = lesson().steps.find(s => s.id === stepId)!;
        for (const token of tokens) {
            expect(step.body.sl, `${stepId} sl ${token}`).toContain(token);
            expect(step.body.en, `${stepId} en ${token}`).toContain(token);
        }
    }
});

test('Back and a scene change while playing leave playback paused with no pending scheduler callback', () => {
    const h = mountHull();
    try {
        h.scene('hull-monotone-chain');
        act(() => { h.capabilities.apply(PLAY); });
        expect([h.graph.isPlaying, h.pending()]).toEqual([true, 1]);
        act(() => { h.capabilities.stopAnimations?.(); });
        expect([h.graph.isPlaying, h.pending()]).toEqual([false, 0]);
        act(() => { h.capabilities.apply(PLAY); });
        expect(h.pending()).toBe(1);
        h.scene('hull-explore');
        expect([h.graph.isPlaying, h.pending(), h.graph.step]).toEqual([false, 0, 0]);
        for (const stepId of STEPS) {
            h.scene(stepId);
            expect([h.graph.isPlaying, h.pending()]).toEqual([false, 0]);
        }
    } finally {
        h.mounted.view.unmount();
    }
});
