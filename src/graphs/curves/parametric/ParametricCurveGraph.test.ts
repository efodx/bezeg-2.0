import React from 'react';
import {fireEvent, render} from '@testing-library/react';
import ParametricCurveGraph, {ROLL_DURATION_MS, widenToCanvas} from './ParametricCurveGraph';
import {ParametricScene} from './ParametricScene';
import {SceneSlot} from '../../base/OwnedScene';
import {DEFAULT_PARAMETRIC_PRESET, parametricPresetCollection} from './parametricPresetCollection';
import {curveViewBox, PARAMETRIC_ROLL_ANIMATION_ID} from './parametricCatalogue';
import {FigureExportScope} from '../../base/export/FigureExportOperation';

/** Counts live language subscriptions, so a leaked listener shows even though the scene also guards its callback. */
const liveSubscriptions = vi.hoisted(() => ({count: 0}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            liveSubscriptions.count++;
            const unsubscribe = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) { released = true; liveSubscriptions.count--; } unsubscribe(); };
        },
    };
});

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        renderer: {},
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, parents, attributes, board, X: () => 0, Y: () => 0};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((o: any) => !list.includes(o));
        }),
        getBoundingBox: () => [-5, 5, 5, -5],
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

function makeGraph() {
    const graph = Object.create(ParametricCurveGraph.prototype) as any;
    graph.board = fakeBoard();
    graph.figureExports = new FigureExportScope({requestRender: () => undefined, reload: () => undefined});
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({...graph.getInitialState(), initialized: true});
    graph.setState = vi.fn((patch: any) => { graph.store.setState(patch); graph.sceneSlot.reconcile(); }); // the host reconciles after each commit
    graph.boardUpdate = vi.fn();
    // The host builds the declared scene in `mount`; the fake session stands in for its lifetime.
    graph.sceneSlot = new SceneSlot({isAlive: true, registerCleanup: () => () => undefined} as any, graph.board, graph.sceneDeclaration());
    graph.sceneSlot.rebuild();
    return graph;
}

const ofType = (board: any, type: string) => board.objectsList.filter((o: any) => o.type === type);

describe('ParametricCurveGraph state and Presets', () => {
    test('the default scene is the unit cycloid and its Preset exports from the state', () => {
        const graph = makeGraph();
        expect(graph.defaultPreset()).toEqual(DEFAULT_PARAMETRIC_PRESET);
        expect(graph.exportPresetData()).toEqual(DEFAULT_PARAMETRIC_PRESET);
        expect(graph.presetCollection()).toBe(parametricPresetCollection);
    });

    test('Preset round trip: import, export, check', () => {
        const graph = makeGraph();
        graph.importPresetData({curve: 'rose', radius: 2, parameter: 1});
        const exported = graph.exportPresetData();
        expect(exported).toEqual({curve: 'rose', radius: 2, parameter: 1});
        const checked = parametricPresetCollection.check(JSON.parse(JSON.stringify(exported)));
        expect('data' in checked && checked.data).toEqual(exported);
    });

    test('a Preset without a saved view is fitted to its curve; one with a saved view keeps it', () => {
        const graph = makeGraph();
        graph.importPreset({id: 'rose', data: {curve: 'rose', radius: 1, parameter: 1}});
        // The view-less Preset first shows the initial view (slice 3), then the fit to its curve decides the final view.
        const calls = graph.board.setBoundingBox.mock.calls;
        expect(calls).toHaveLength(2);
        const fitted = calls[1][0];
        const roseBox = curveViewBox({curve: 'rose', radius: 1});
        expect(fitted).toEqual(roseBox);
        expect(roseBox).not.toEqual(curveViewBox({curve: 'cycloid', radius: 1}));

        const saved = [-7, 6, 9, -4];
        graph.board.setBoundingBox.mockClear();
        graph.importPreset({id: 'spiral', data: {curve: 'spiral', radius: 1, parameter: 1}, boardState: {boundingBox: saved}});
        expect(graph.board.setBoundingBox.mock.calls.map((call: any[]) => call[0])).toEqual([saved]);
    });
});

describe('lesson scenes', () => {
    test('a lesson fixture keeps its curve: the state replacement after the import carries the imported data', () => {
        const graph = makeGraph();
        // The order of BaseGraph.prepareLessonFixtureScene: import the fixture, then replace the state.
        graph.importPresetData({curve: 'rose', radius: 2, parameter: 1});
        graph.store.replaceState({...graph.getInitialState(), ...graph.lessonDefaultState()});
        expect(graph.exportPresetData()).toEqual({curve: 'rose', radius: 2, parameter: 1});
        expect(graph.scene.curve).toBe('rose');
    });
});

describe('scene construction failure', () => {
    test('a scene whose build throws removes what it created', () => {
        const board = fakeBoard();
        const create = board.create.getMockImplementation();
        let calls = 0;
        board.create.mockImplementation((...args: any[]) => {
            if (++calls === 4) throw new Error('board failure');
            return create(...args);
        });
        const before = liveSubscriptions.count;
        expect(() => new ParametricScene({board, curve: 'cycloid', radius: () => 1, parameter: () => 0, traceFull: () => true}))
            .toThrow('board failure');
        expect(board.objectsList).toEqual([]);
        expect(liveSubscriptions.count).toBe(before);
    });
});

describe('owned scene', () => {
    test('the scene reads the radius and the parameter lazily', () => {
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        const circle = ofType(graph.board, 'circle')[0];
        expect(circle.parents[1]()).toBe(1);
        graph.setRadius(2);
        expect(circle.parents[1]()).toBe(2);
        const marker = graph.board.objectsList.find((o: any) => o.type === 'point' && o.attributes.size === 4);
        graph.setParameter(Math.PI);
        expect(marker.parents[0]()).toBeCloseTo(2 * Math.PI, 12);
        expect(marker.parents[1]()).toBeCloseTo(4, 12);
    });

    test('the velocity arrow is hidden and its tip undefined at a cusp, and ends at point plus velocity elsewhere', () => {
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        const arrow = ofType(graph.board, 'segment').find((s: any) => s.attributes.lastArrow);
        expect(arrow.attributes.visible()).toBe(false);
        const tip = arrow.parents[1];
        expect(tip.parents[0]()).toBeNaN();
        graph.setParameter(Math.PI / 2);
        expect(arrow.attributes.visible()).toBe(true);
        // r(pi/2) = (pi/2 - 1, 1) and r'(pi/2) = (1, 1).
        expect(tip.parents[0]()).toBeCloseTo(Math.PI / 2 - 1 + 1, 12);
        expect(tip.parents[1]()).toBeCloseTo(2, 12);
    });

    test('catalogue switch disposes the old curve elements; only polar curves get a radius ray', () => {
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        const cycloidElements = [...graph['scene'].ownedElements()];
        expect(ofType(graph.board, 'circle')).toHaveLength(1);
        expect(ofType(graph.board, 'segment')).toHaveLength(2);
        graph.setCurve('cardioid');
        expect(cycloidElements.some(e => graph.board.objectsList.includes(e))).toBe(false);
        expect(ofType(graph.board, 'circle')).toHaveLength(0);
        expect(graph.board.objectsList).toEqual(graph['scene'].ownedElements());
        const ray = ofType(graph.board, 'segment').find((s: any) => !s.attributes.lastArrow);
        expect(ray.parents[0].parents).toEqual([0, 0]);
        expect(graph.state.parameter).toBe(0);
        expect(graph.board.setBoundingBox).toHaveBeenCalled();
    });

    test('importPresetData replaces rather than stacks, a same-curve import keeps the scene, and release removes all of it', () => {
        const graph = makeGraph();
        graph.importPresetData(graph.defaultPreset());
        const first = graph.board.objectsList.length;
        const scene = graph['scene'];
        graph.importPresetData({...graph.defaultPreset(), parameter: 1});
        expect(graph['scene']).toBe(scene);
        graph.importPresetData({curve: 'rose', radius: 1, parameter: 0});
        graph.importPresetData(graph.defaultPreset());
        expect(graph['scene']).not.toBe(scene);
        expect(graph.board.objectsList.length).toBe(first);
        graph.sceneSlot.release();
        expect(graph.board.objectsList).toEqual([]);
    });

    test('unmount disposes the scene before the board goes', () => {
        const before = liveSubscriptions.count;
        const graph = makeGraph();
        const board = graph.board;
        const order: string[] = [];
        // The session releases the slot in its cleanup, then the board goes.
        const cleanups: Array<() => void> = [];
        graph.graphSession = {isReady: true, isAlive: true, registerCleanup: (cleanup: () => void) => cleanups.push(cleanup),
            dispose: () => { cleanups.forEach(cleanup => cleanup()); order.push('session'); }};
        graph.sceneSlot.release();
        graph.sceneSlot = new SceneSlot(graph.graphSession, board, graph.sceneDeclaration());
        graph.sceneSlot.rebuild();
        graph.importPresetData(graph.defaultPreset());
        expect(liveSubscriptions.count).toBe(before);
        const remove = board.removeObject;
        board.removeObject = vi.fn((o: any) => { order.push('removed'); return remove(o); });
        graph.pendingCallbacks = [];
        graph.unmount();
        expect(order[0]).toBe('removed');
        expect(board.objectsList).toEqual([]);
        expect(liveSubscriptions.count).toBe(before);
    });

    test('scene dispose is idempotent', () => {
        const board = fakeBoard();
        const scene = new ParametricScene({board, curve: 'rose', radius: () => 1, parameter: () => 0.3, traceFull: () => true});
        scene.dispose();
        scene.dispose();
        expect(board.removeObject).toHaveBeenCalledTimes(1);
        expect(board.objectsList).toEqual([]);
    });

    test('the scene draws no board text (the numbers are Odčitki rows) and holds no language subscription', () => {
        const board = fakeBoard();
        const before = liveSubscriptions.count;
        const scene = new ParametricScene({board, curve: 'cycloid', radius: () => 1, parameter: () => Math.PI / 2, traceFull: () => true});
        expect(scene.ownedElements().filter(element => (element as any).elType === 'text')).toEqual([]);
        expect(board.create.mock.calls.some((call: unknown[]) => call[0] === 'text')).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
        scene.dispose();
    });
});

describe('values (the numbers of the Odčitki rows)', () => {
    const values = (curve: any, radius: number, parameter: number) => {
        const scene = new ParametricScene({board: fakeBoard(), curve, radius: () => radius, parameter: () => parameter, traceFull: () => true});
        const result = scene.values();
        scene.dispose();
        return result;
    };

    test('cycloid r = 1 has length 8 and area 9.4248 (3 pi)', () => {
        const {length, area} = values('cycloid', 1, 1);
        expect(length).toBeCloseTo(8, 6);
        expect(area).toBeCloseTo(3 * Math.PI, 6);
    });

    test('the cusp is stopped: no vector', () => {
        const {velocity} = values('cycloid', 1, 0);
        expect(velocity.status).toBe('stopped');
        expect(velocity.speed).toBe(0);
    });

    test('polar curves report the ray radius, the cycloid has none', () => {
        expect(values('cardioid', 1, 0).ray).toBeCloseTo(2, 9);
        expect(values('cycloid', 1, 1).ray).toBeUndefined();
    });
});

describe('roll animation', () => {
    test('the id constant is defined here until the lesson registration adds it', () => {
        expect(PARAMETRIC_ROLL_ANIMATION_ID).toBe('parametric-roll');
    });

    function withFrames() {
        const callbacks = new Map<number, FrameRequestCallback>();
        let next = 1;
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { callbacks.set(next, cb); return next++; });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
        const tick = (now: number) => { const [id, cb] = [...callbacks][0]; callbacks.delete(id); cb(now); };
        return {callbacks, tick};
    }
    afterEach(() => vi.restoreAllMocks());

    test('rolls to the end of the arch, then stops by itself', () => {
        const {callbacks, tick} = withFrames();
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        graph.playRoll();
        expect(graph.rolling).toBe(true);
        tick(0);
        tick(ROLL_DURATION_MS / 2);
        expect(graph.state.parameter).toBeCloseTo(Math.PI, 9);
        tick(ROLL_DURATION_MS);
        expect(graph.state.parameter).toBeCloseTo(2 * Math.PI, 9);
        expect(graph.rolling).toBe(false);
        expect(callbacks.size).toBe(0);
    });

    test('a lesson step change stops the roll and resets to t = 0; so does switching the curve', () => {
        const {callbacks, tick} = withFrames();
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        graph.playRoll();
        tick(0);
        tick(1000);
        expect(graph.state.parameter).toBeGreaterThan(0);
        graph.stopLessonAnimations();
        expect(graph.rolling).toBe(false);
        expect(callbacks.size).toBe(0);
        expect(graph.state.parameter).toBe(0);
        graph.playRoll();
        graph.setCurve('rose');
        expect(graph.rolling).toBe(false);
    });

    test('an accepted edit pauses the roll and keeps the parameter; the roll itself does not (decision 57)', () => {
        const {tick} = withFrames();
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        graph.playRoll();
        tick(0);
        tick(1000);
        expect(graph.rolling).toBe(true);
        graph.setParameter(1);
        expect(graph.rolling).toBe(false);
        expect(graph.state.parameter).toBe(1);
        graph.playRoll();
        graph.setRadius(1.5);
        expect(graph.rolling).toBe(false);
        graph.playRoll();
        graph.setRadius(Number.NaN);
        expect(graph.rolling).toBe(true);
    });

    test('Play under reduced motion is blocked with its reason and the button never starts the roll', () => {
        const graph = makeGraph();
        graph.importPresetData(graph.defaultPreset());
        vi.spyOn(graph, 'reducedMotion').mockReturnValue(true);
        const view = render(React.createElement('div', null, ...graph.getGraphCommands()));
        const play = view.container.querySelector<HTMLButtonElement>('[data-action="play-pause"]')!;
        expect(play.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(play);
        expect(graph.rolling).toBe(false);
        view.unmount();
    });

    test('lesson play and replay under reduced motion show the completed roll and start no driver', () => {
        const {callbacks} = withFrames();
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        vi.spyOn(graph, 'reducedMotion').mockReturnValue(true);
        graph['rollCommand']('play');
        expect(graph.rolling).toBe(false);
        expect(graph.state.parameter).toBeCloseTo(2 * Math.PI, 9);
        graph['rollCommand']('reset');
        expect(graph.state.parameter).toBe(0);
        graph['rollCommand']('replay');
        expect(graph.rolling).toBe(false);
        expect(graph.state.parameter).toBeCloseTo(2 * Math.PI, 9);
        expect(callbacks.size).toBe(0);
    });

    test('lesson play without reduced motion rolls', () => {
        withFrames();
        const graph = makeGraph();
        graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
        vi.spyOn(graph, 'reducedMotion').mockReturnValue(false);
        graph['rollCommand']('play');
        expect(graph.rolling).toBe(true);
    });

    test('unmount cancels a running roll', () => {
        const {callbacks} = withFrames();
        const graph = makeGraph();
        graph.importPresetData(graph.defaultPreset());
        graph.playRoll();
        graph.graphSession = {isReady: true, isAlive: true, dispose: () => undefined};
        graph.pendingCallbacks = [];
        graph.unmount();
        expect(callbacks.size).toBe(0);
    });
});

describe('widenToCanvas', () => {
    test('a wide curve box on a narrow canvas keeps its whole width in view, with the canvas aspect', () => {
        const cycloid = curveViewBox({curve: 'cycloid', radius: 1});
        const [left, top, right, bottom] = widenToCanvas(cycloid, 364, 295);
        expect(left).toBeLessThanOrEqual(cycloid[0]);
        expect(right).toBeGreaterThanOrEqual(cycloid[2]);
        expect(top).toBeGreaterThanOrEqual(cycloid[1]);
        expect(bottom).toBeLessThanOrEqual(cycloid[3]);
        expect((right - left) / (top - bottom)).toBeCloseTo(364 / 295, 9);
    });

    test('a tall canvas widens the other side, and an unknown canvas size leaves the box as it is', () => {
        const box: [number, number, number, number] = [-1, 5, 3, -1];
        const [left, top, right, bottom] = widenToCanvas(box, 200, 600);
        expect(left).toBeLessThanOrEqual(-1);
        expect(bottom).toBeLessThanOrEqual(-1);
        expect((top - bottom) / (right - left)).toBeCloseTo(3, 9);
        expect(widenToCanvas(box, undefined, undefined)).toBe(box);
    });
});
