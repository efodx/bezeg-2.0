import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims} from '../../graphs/base/realGraphTestHarness';
import {FakeSurfaceView} from '../../graphs/patches/FakeSurfaceView';
import TensorJoinGraph from '../../graphs/patches/TensorJoinGraph';
import TensorSubdivisionGraph from '../../graphs/patches/TensorSubdivisionGraph';
import TriangularPatchGraph from '../../graphs/patches/TriangularPatchGraph';
import {pinholeProject} from '../../graphs/patches/surface-view/pinholeOracle.test-helper';
import {LessonSession} from '../runtime/LessonSession';
import {patchChapterSectionIds} from './patchChapter';
import {patchGuidedExamplesAdvanced, type PatchAdvancedExampleSectionId} from './patchGuidedExamplesAdvanced';

beforeAll(installBoardShims);

const sections = Object.keys(patchGuidedExamplesAdvanced) as PatchAdvancedExampleSectionId[];
function mount(Graph: typeof TensorSubdivisionGraph): {graph: TensorSubdivisionGraph; view: FakeSurfaceView};
function mount(Graph: typeof TensorJoinGraph): {graph: TensorJoinGraph; view: FakeSurfaceView};
function mount(Graph: typeof TriangularPatchGraph): {graph: TriangularPatchGraph; view: FakeSurfaceView};
function mount(Graph: typeof TensorSubdivisionGraph | typeof TensorJoinGraph | typeof TriangularPatchGraph) {
    const view = new FakeSurfaceView();
    const graph = new Graph({viewFactory: () => view});
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

const closeVector = (actual: readonly number[], expected: readonly number[]) => {
    expect(actual).toHaveLength(3);
    expect(actual.every(Number.isFinite)).toBe(true);
    actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
};
function expectPatchInView(scene: FakeSurfaceView['last'], minimumMeshBounds?: {width: number; height: number}): void {
    for (const aspect of [390 / 844, 420 / 260]) {
        const viewport = {width: aspect * 1000, height: 1000};
        const coordinates = [
            ...scene.points.map(({xyz}) => xyz),
            ...(scene.mesh?.positions ? Array.from({length: scene.mesh.positions.length / 3}, (_, index) => [
                scene.mesh!.positions[index * 3], scene.mesh!.positions[index * 3 + 1], scene.mesh!.positions[index * 3 + 2],
            ] as const) : []),
        ];
        expect(coordinates.length).toBeGreaterThan(0);
        for (const xyz of coordinates) {
            const projected = pinholeProject(scene.camera, viewport, xyz);
            expect(Math.abs(projected.ndcX)).toBeLessThanOrEqual(1);
            expect(Math.abs(projected.ndcY)).toBeLessThanOrEqual(1);
            expect(projected.ndcZ).toBeGreaterThanOrEqual(-1);
            expect(projected.ndcZ).toBeLessThanOrEqual(1);
        }
        if (minimumMeshBounds && aspect > 1 && scene.mesh?.positions) {
            const projectedMesh = Array.from({length: scene.mesh.positions.length / 3}, (_, index) =>
                pinholeProject(scene.camera, viewport, [scene.mesh!.positions[index * 3], scene.mesh!.positions[index * 3 + 1], scene.mesh!.positions[index * 3 + 2]]));
            const width = Math.max(...projectedMesh.map(point => point.ndcX)) - Math.min(...projectedMesh.map(point => point.ndcX));
            const height = Math.max(...projectedMesh.map(point => point.ndcY)) - Math.min(...projectedMesh.map(point => point.ndcY));
            expect(width).toBeGreaterThan(minimumMeshBounds.width);
            expect(height).toBeGreaterThan(minimumMeshBounds.height);
        }
    }
}

describe('advanced patch guided examples', () => {
    it('uses the four chapter section identities and complete bilingual frames', () => {
        expect(sections).toEqual(['tensor-subdivision', 'tensor-joins', 'triangular-patches', 'square-vs-triangular']);
        expect(sections.every(section => patchChapterSectionIds.includes(section))).toBe(true);
        for (const section of sections) {
            const lesson = patchGuidedExamplesAdvanced[section];
            expect(lesson.steps.length).toBeGreaterThan(0);
            for (const step of lesson.steps) {
                expect(step.frames?.length).toBeGreaterThanOrEqual(2);
                for (const item of step.frames ?? []) {
                    expect(item.title.sl.trim()).not.toBe('');
                    expect(item.title.en.trim()).not.toBe('');
                    expect(item.body?.sl.trim()).not.toBe('');
                    expect(item.body?.en.trim()).not.toBe('');
                }
            }
        }
    });

    it('elevates and subdivides the saddle synchronously while preserving its evaluated point', () => {
        const {graph, view} = mount(TensorSubdivisionGraph);
        const initial = graph.state;
        const lesson = patchGuidedExamplesAdvanced['tensor-subdivision'];
        const session = new LessonSession(lesson, graph.getLessonCapabilities());
        act(() => session.start());
        expect(graph.state).toMatchObject({m: 2, n: 1, u: 0.25, v: 0.5});
        closeVector(view.last.markers.find(marker => marker.id === 'evaluated')!.xyz, [0.25, 0.5, 0.125]);
        expect(view.last.mesh?.positions.length).toBeGreaterThan(0);
        expect(view.last.polylines.some(line => line.id === 'ghost-row-0')).toBe(true);

        act(() => session.next());
        act(() => session.next());
        expect(graph.state).toMatchObject({m: 1, n: 1, subdivisionDirection: 'u', subdivisionValue: 0.5, showPieces: true, u: 0.5, v: 0.5});
        closeVector(view.last.markers.find(marker => marker.id === 'evaluated')!.xyz, [0.5, 0.5, 0.25]);
        expect(view.last.polylines.some(line => line.id === 'piece-l-row-0' && line.role === 'net')).toBe(true);
        expect(view.last.polylines.some(line => line.id === 'piece-r-row-0' && line.role === 'net-2')).toBe(true);
        expect(view.last.polylines.find(line => line.id === 'split-curve')?.points.length).toBeGreaterThan(1);
        // The seam is u=1 in the left bilinear piece and u=0 in the right one.
        // Evaluate those drawn boundary control rows independently at local v=1/2.
        for (const id of ['piece-l-row-1', 'piece-r-row-0']) {
            const controls = view.last.polylines.find(line => line.id === id)!.points;
            expect(controls).toHaveLength(2);
            closeVector(controls[0].map((value, axis) => (value + controls[1][axis]) / 2), [0.5, 0.5, 0.25]);
        }

        act(() => session.close());
        expect(graph.state).toEqual(initial);
    });

    it('evaluates a canonical cubic triangular fixture at the centroid and renders its three boundaries', () => {
        const {graph, view} = mount(TriangularPatchGraph);
        const initial = graph.state;
        const lesson = patchGuidedExamplesAdvanced['triangular-patches'];
        const session = new LessonSession(lesson, graph.getLessonCapabilities());
        act(() => session.start());

        expect(graph.state).toMatchObject({n: 3, u: 1 / 3, v: 1 / 3, showControlNet: true, showBoundaryCurves: true, showDeCasteljau: true});
        closeVector(view.last.markers.find(marker => marker.id === 'evaluated')!.xyz, [1 / 3, 1 / 3, 1]);
        expectPatchInView(view.last, {width: 0.49, height: 0.45});
        expect(view.last.mesh?.positions.length).toBeGreaterThan(0);
        expectPatchInView(view.last, {width: 0.49, height: 0.45});
        expect(view.last.points).toHaveLength(10);
        expect(view.last.polylines.filter(line => line.id.startsWith('boundary-'))).toHaveLength(3);
        expect(view.last.polylines.some(line => line.role === 'construction')).toBe(true);
        for (const line of view.last.polylines.filter(item => item.id.startsWith('boundary-'))) {
            expect(line.points.every(point => Math.abs(point[2]) < 1e-10)).toBe(true);
        }

        act(() => session.close());
        expect(graph.state).toEqual(initial);
    });

    it('renders the comparison overlay and checks the triangular/tensor interior contrast', () => {
        const {graph, view} = mount(TriangularPatchGraph);
        const initial = graph.state;
        const lesson = patchGuidedExamplesAdvanced['square-vs-triangular'];
        const session = new LessonSession(lesson, graph.getLessonCapabilities());
        act(() => session.start());

        expect(graph.state).toMatchObject({n: 3, u: 1 / 3, v: 1 / 3});
        closeVector(view.last.markers.find(marker => marker.id === 'evaluated')!.xyz, [1 / 3, 1 / 3, 1]);
        const comparison = view.last.polylines.filter(line => line.role === 'compare');
        expect(comparison.length).toBeGreaterThan(0);
        expect(comparison.some(line => line.id === 'compare-boundary-u0')).toBe(true);
        expect(comparison.some(line => line.id === 'compare-boundary-v0')).toBe(true);
        expect(comparison.every(line => line.points.every(point => Math.abs(point[2]) < 1e-10))).toBe(true);
        expect(view.last.mesh?.positions.length).toBeGreaterThan(0);

        act(() => session.close());
        expect(graph.state).toEqual(initial);
        expect(view.last.polylines.some(line => line.role === 'compare')).toBe(false);
    });

    it('checks C0, C1 and G1 join reports and the rendered 32-patch teapot owners', () => {
        const {graph, view} = mount(TensorJoinGraph);
        const initial = graph.state;
        const lesson = patchGuidedExamplesAdvanced['tensor-joins'];
        const session = new LessonSession(lesson, graph.getLessonCapabilities());
        act(() => session.start());

        expect(graph.state.joinContinuity).toBe('c0');
        expect(graph.joinReport()).toMatchObject({c0: true, c1: false});
        expect(graph.joinReport().positionGap).toBeLessThan(1e-10);
        expect(view.last.polylines.find(line => line.id === 'join-boundary-a')?.points).toEqual(view.last.polylines.find(line => line.id === 'join-boundary-b')?.points);
        expectPatchInView(view.last, {width: 0.52, height: 0.45});
        const authoredCamera = graph.state.camera;

        act(() => { session.next(); session.next(); });
        expect(graph.state.joinContinuity).toBe('c1');
        expect(graph.joinReport()).toMatchObject({c0: true, c1: true, g1: true});
        expect(graph.joinReport().c1Residual).toBeLessThan(1e-10);
        expect(view.last.polylines.some(line => line.role === 'vector-u')).toBe(true);
        expect(view.last.polylines.some(line => line.role === 'vector-v')).toBe(true);
        expect(graph.state.camera).toEqual(authoredCamera);
        expectPatchInView(view.last, {width: 0.52, height: 0.45});

        act(() => { session.next(); session.next(); });
        expect(graph.state.joinContinuity).toBe('g1');
        expect(graph.state.joinAlpha).toBe(2);
        expect(graph.joinReport()).toMatchObject({c0: true, c1: false, g1: true, alphaStar: 2});
        expect(graph.joinReport().g1Residual).toBeLessThan(1e-10);
        expect(graph.state.camera).toEqual(authoredCamera);
        expectPatchInView(view.last, {width: 0.52, height: 0.45});

        act(() => { session.next(); session.next(); });
        expect(graph.capstone()).toBe(true);
        expect(view.last.mesh?.positions.length).toBeGreaterThan(0);
        expect(view.last.meshOwners).toHaveLength(32);
        expect(view.last.meshOwners?.every(owner => owner.kind === 'teapot' && owner.faceCount > 0)).toBe(true);
        expect(view.last.interaction.editable).toBe(false);

        act(() => session.close());
        expect(graph.state).toEqual(initial);
    });
});
