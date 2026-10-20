import {activities, findActivity} from './activities';
import {ActivitySession, ActivitySessionRollbackError} from './ActivitySession';
import type {LessonAction, LessonSceneCheckpoint} from '../model';
import BezierCurveGraph from '../../graphs/curves/bezier/BezierCurveGraph';
import DecasteljauGraph from '../../graphs/curves/bezier/DecasteljauGraph';
import AffineTransformBezierCurveGraph from '../../graphs/curves/bezier/AffineTransformsBezierCurveGraph';
import {BernsteinGraph} from '../../graphs/bernstein/BernsteinGraph';

const checkpoint = (value: unknown): LessonSceneCheckpoint => ({version: 1, value});

describe('Bézier chapter activities', () => {
    test('registers the six authored scenes on their existing demonstrations and stable sections', () => {
        expect(activities.map(({id, demonstrationId, sectionId}) => [id, demonstrationId, sectionId])).toEqual([
            ['shape-control', 'bezier', 'control-points'],
            ['curve-parameter', 'decasteljau', 'parameter'],
            ['repeated-interpolation', 'decasteljau', 'interpolation'],
            ['blending-coefficients', 'bernstein', 'bernstein-form'],
            ['geometric-bounds', 'bezier', 'geometric-properties'],
            ['transform-shape', 'affine', 'affine-transformations'],
        ]);
        expect(findActivity('unknown')).toBeUndefined();
        expect(findActivity('curve-parameter')).not.toBe(findActivity('repeated-interpolation'));
        const graphFor = (id: string) => id === 'bezier' ? new BezierCurveGraph()
            : id === 'decasteljau' ? new DecasteljauGraph()
                : id === 'bernstein' ? new BernsteinGraph()
                    : new AffineTransformBezierCurveGraph();
        for (const activity of activities) {
            const graph = graphFor(activity.demonstrationId);
            for (const action of activity.actions) expect(graph.supportsLessonAction(action)).toBe(true);
        }
    });

    test('uses distinct cubic, quartic, quadratic, and affine defaults with the authored midpoint checks', () => {
        const midpoint = (points: readonly (readonly [number, number])[]) => points.reduce(([x, y], [px, py], i) => {
            const degree = points.length - 1;
            const choose = (n: number, k: number): number => k === 0 || k === n ? 1 : choose(n - 1, k - 1) + choose(n - 1, k);
            const weight = choose(degree, i) / 2 ** degree;
            return [x + px * weight, y + py * weight] as [number, number];
        }, [0, 0] as [number, number]);
        expect(midpoint([[-4, -3], [-3, 2], [2, 2], [3, -2]])).toEqual([-0.5, 0.875]);
        expect(midpoint([[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]])).toEqual([0, 1.75]);
        const affine = midpoint([[-3, 2], [0, -2], [1, 2], [3, -2]]);
        expect(affine).toEqual([0.375, 0]);
        expect(affine[0] + 0.5).toBe(0.875);
        expect(activities.find(activity => activity.id === 'blending-coefficients')?.actions).toContainEqual({kind: 'bernstein-degree', degree: 2});
    });

    test('applies preparation synchronously and captures paused independent snapshots', () => {
        const state = {scene: 'ordinary', edits: 0, playing: true};
        const applied: LessonAction[] = [];
        const graph = {
            captureState: vi.fn(() => checkpoint({...state})),
            restoreState: vi.fn((saved: LessonSceneCheckpoint) => Object.assign(state, saved.value as object)),
            apply: vi.fn((action: LessonAction) => {
                applied.push(action);
                if (action.kind === 'prepared-scene') Object.assign(state, {scene: action.sceneId, playing: false});
                if (action.kind === 'parameter' && action.name === 't') Object.assign(state, {t: action.value});
                if (action.kind === 'animation' && action.command === 'pause') state.playing = false;
            }),
            pauseAnimations: vi.fn(() => { state.playing = false; }),
            stopAnimations: vi.fn(() => { state.playing = false; }),
            isAvailable: () => true,
        };
        const activity = findActivity('curve-parameter')!;
        const session = new ActivitySession(activity, graph);
        session.start();
        expect(applied).toEqual(activity.actions);
        expect(state).toMatchObject({scene: 'decasteljau-quartic', t: 0.5, playing: false});
        state.playing = true;
        graph.pauseAnimations.mockClear();
        graph.stopAnimations.mockClear();
        const saved = session.capture();
        expect(saved.value).toMatchObject({playing: false});
        expect(graph.pauseAnimations).toHaveBeenCalled();
        expect(graph.stopAnimations).not.toHaveBeenCalled();
        Object.assign(state, {scene: 'edited', t: 0.8});
        session.reset();
        expect(state).toMatchObject({scene: 'decasteljau-quartic', t: 0.5});
        session.start(saved);
        expect(state).toMatchObject(saved.value as object);
    });

    test('activity reset returns to authored state while a saved visit resumes its last valid scene', () => {
        const state = {scene: 'ordinary', edits: 0, playing: false};
        const graph = {
            captureState: vi.fn(() => checkpoint({...state})),
            restoreState: vi.fn((saved: LessonSceneCheckpoint) => Object.assign(state, saved.value as object)),
            apply: vi.fn((action: LessonAction) => {
                if (action.kind === 'prepared-scene') state.scene = action.sceneId;
                if (action.kind === 'parameter' && action.name === 't') state.edits = action.value;
            }),
            pauseAnimations: vi.fn(() => { state.playing = false; }),
            stopAnimations: vi.fn(),
            isAvailable: () => true,
        };
        const session = new ActivitySession(findActivity('curve-parameter')!, graph);
        session.start();
        Object.assign(state, {scene: 'learner-edits', edits: 0.8});
        const lastValid = session.capture();

        session.reset();
        expect(state).toMatchObject({scene: 'decasteljau-quartic', edits: 0.5, playing: false});
        session.start(lastValid);
        expect(state).toMatchObject({scene: 'learner-edits', edits: 0.8, playing: false});
    });

    test('rolls back a partial scene when an action or capture fails', () => {
        const state = {scene: 'before'};
        let shouldFail = true;
        const graph = {
            captureState: vi.fn(() => checkpoint({...state})),
            restoreState: vi.fn((saved: LessonSceneCheckpoint) => Object.assign(state, saved.value as object)),
            apply: vi.fn((action: LessonAction) => {
                if (action.kind === 'prepared-scene') state.scene = action.sceneId;
                if (shouldFail && action.kind === 'curve-visibility') throw new Error('action failed');
            }),
            stopAnimations: vi.fn(),
            isAvailable: () => true,
        };
        const session = new ActivitySession(findActivity('geometric-bounds')!, graph);
        expect(() => session.start()).toThrow('action failed');
        expect(state.scene).toBe('before');
        expect(graph.restoreState).toHaveBeenCalledTimes(1);

        shouldFail = false;
        graph.captureState.mockImplementationOnce(() => checkpoint({...state})).mockImplementationOnce(() => { throw new Error('capture failed'); });
        expect(() => session.capture()).toThrow('capture failed');
        expect(state.scene).toBe('before');
    });

    test('rejects disposed graphs before capture, stop, restore, or mutation', () => {
        const state = {scene: 'ordinary'};
        const graph = {
            captureState: vi.fn(() => checkpoint({...state})), restoreState: vi.fn(), apply: vi.fn(),
            stopAnimations: vi.fn(), pauseAnimations: vi.fn(), isAvailable: () => false,
        };
        const session = new ActivitySession(findActivity('shape-control')!, graph);
        expect(() => session.start()).toThrow('no longer available');
        expect(state.scene).toBe('ordinary');
        expect(graph.captureState).not.toHaveBeenCalled();
        expect(graph.apply).not.toHaveBeenCalled();
        expect(graph.pauseAnimations).not.toHaveBeenCalled();
        expect(graph.stopAnimations).not.toHaveBeenCalled();
        expect(graph.restoreState).not.toHaveBeenCalled();
    });

    test('later dependent activity actions see prior writes and failure restores the edited pre-operation scene', () => {
        const state = {scene: 'learner-edits', t: 0.2, controlPolygon: false, playing: true};
        const observedScenes: string[] = [];
        const graph = {
            captureState: vi.fn(() => checkpoint({...state})),
            restoreState: vi.fn((saved: LessonSceneCheckpoint) => Object.assign(state, saved.value as object)),
            apply: vi.fn((action: LessonAction) => {
                if (action.kind === 'prepared-scene') state.scene = action.sceneId;
                if (action.kind === 'curve-visibility' && action.target === 'control-polygon') {
                    observedScenes.push(state.scene);
                    state.controlPolygon = action.visible;
                }
                if (action.kind === 'curve-visibility' && action.target === 'convex-hull') throw new Error('later action failed');
            }),
            pauseAnimations: vi.fn(() => { state.playing = false; }),
            stopAnimations: vi.fn(),
            isAvailable: () => true,
        };
        const session = new ActivitySession(findActivity('geometric-bounds')!, graph);

        expect(() => session.start()).toThrow('later action failed');
        expect(observedScenes).toEqual(['bezier-default']);
        expect(state).toEqual({scene: 'learner-edits', t: 0.2, controlPolygon: false, playing: false});
        expect(graph.restoreState).toHaveBeenCalledWith(checkpoint({scene: 'learner-edits', t: 0.2, controlPolygon: false, playing: false}));
    });

    test('surfaces rollback failure with both causes when a partial scene cannot be restored', () => {
        const state = {scene: 'ordinary'};
        const graph = {
            captureState: vi.fn(() => checkpoint({...state})),
            restoreState: vi.fn(() => {throw new Error('rollback unavailable');}),
            apply: vi.fn((action: LessonAction) => {
                if (action.kind === 'prepared-scene') state.scene = action.sceneId;
                if (action.kind === 'curve-visibility') throw new Error('scene action failed');
            }),
            stopAnimations: vi.fn(),
            isAvailable: () => true,
        };
        const session = new ActivitySession(findActivity('geometric-bounds')!, graph);

        let failure: unknown;
        try { session.start(); } catch (error) { failure = error; }
        expect(failure).toBeInstanceOf(ActivitySessionRollbackError);
        expect((failure as ActivitySessionRollbackError).operationError).toEqual(new Error('scene action failed'));
        expect((failure as ActivitySessionRollbackError).rollbackError).toEqual(new Error('rollback unavailable'));
        expect(state.scene).toBe('bezier-default');
    });
});
