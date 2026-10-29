import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import * as THREE from 'three';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims} from '../../graphs/base/realGraphTestHarness';
import {FakeSurfaceView} from '../../graphs/patches/FakeSurfaceView';
import TensorDeCasteljauGraph from '../../graphs/patches/TensorDeCasteljauGraph';
import TensorDerivativesGraph from '../../graphs/patches/TensorDerivativesGraph';
import TensorPatchGraph from '../../graphs/patches/TensorPatchGraph';
import {cameraPosition, FOV_DEG} from '../../graphs/patches/surface-view/surfaceMath';
import {LessonSession} from '../runtime/LessonSession';
import {patchChapterSectionIds} from './patchChapter';
import {patchGuidedExamplesEvaluation, type PatchEvaluationExampleSectionId} from './patchGuidedExamplesEvaluation';

beforeAll(installBoardShims);

const sections = Object.keys(patchGuidedExamplesEvaluation) as PatchEvaluationExampleSectionId[];
function mount(Graph: typeof TensorDeCasteljauGraph): {graph: TensorDeCasteljauGraph; view: FakeSurfaceView; capabilities: ReturnType<TensorDeCasteljauGraph['getLessonCapabilities']>};
function mount(Graph: typeof TensorDerivativesGraph): {graph: TensorDerivativesGraph; view: FakeSurfaceView; capabilities: ReturnType<TensorDerivativesGraph['getLessonCapabilities']>};
function mount(Graph: typeof TensorPatchGraph): {graph: TensorPatchGraph; view: FakeSurfaceView; capabilities: ReturnType<TensorPatchGraph['getLessonCapabilities']>};
function mount(Graph: typeof TensorPatchGraph | typeof TensorDeCasteljauGraph | typeof TensorDerivativesGraph) {
    const view = new FakeSurfaceView();
    const graph = new Graph({viewFactory: () => view});
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, capabilities: graph.getLessonCapabilities()};
}
const closeVector = (actual: readonly number[], expected: readonly number[]) => {
    expect(actual).toHaveLength(3);
    expect(expected).toHaveLength(3);
    expect(actual.every(Number.isFinite)).toBe(true);
    actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6));
};
function expectPatchInView(scene: FakeSurfaceView['last']): void {
    for (const aspect of [390 / 844, 1440 / 900]) {
        const camera = new THREE.PerspectiveCamera(FOV_DEG, aspect, 0.05, 500);
        camera.up.set(0, 0, 1);
        camera.position.set(...cameraPosition(scene.camera.az, scene.camera.el, scene.camera.distance, scene.camera.target));
        camera.lookAt(...scene.camera.target);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const coordinates = [
            ...scene.points.map(({xyz}) => xyz),
            ...(scene.mesh?.positions ? Array.from({length: scene.mesh.positions.length / 3}, (_, index) => [
                scene.mesh!.positions[index * 3], scene.mesh!.positions[index * 3 + 1], scene.mesh!.positions[index * 3 + 2],
            ] as const) : []),
        ];
        expect(coordinates.length).toBeGreaterThan(0);
        for (const xyz of coordinates) {
            const projected = new THREE.Vector3(...xyz).project(camera);
            expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
            expect(projected.z).toBeGreaterThanOrEqual(-1);
            expect(projected.z).toBeLessThanOrEqual(1);
        }
    }
}
const direction = (actual: readonly number[], expected: readonly number[]) => {
    const length = Math.hypot(...actual);
    expect(length).toBeGreaterThan(0);
    closeVector(actual.map(value => value / length), expected.map(value => value / Math.hypot(...expected)));
};
type Xyz = readonly [number, number, number];
const lerp = (a: Xyz, b: Xyz, t: number): Xyz => [0, 1, 2].map(axis => a[axis] * (1 - t) + b[axis] * t) as unknown as Xyz;
function deCasteljau(points: readonly Xyz[], t: number): Xyz {
    let level = [...points];
    while (level.length > 1) level = level.slice(0, -1).map((item, index) => lerp(item, level[index + 1], t));
    return level[0];
}
function stagedEvaluation(net: readonly Xyz[], degreeU: number, degreeV: number, u: number, v: number, first: 'u' | 'v'): Xyz {
    const atU = (j: number) => deCasteljau(Array.from({length: degreeU + 1}, (_, i) => net[i * (degreeV + 1) + j]), u);
    const atV = (i: number) => deCasteljau(net.slice(i * (degreeV + 1), (i + 1) * (degreeV + 1)), v);
    return first === 'u'
        ? deCasteljau(Array.from({length: degreeV + 1}, (_, j) => atU(j)), v)
        : deCasteljau(Array.from({length: degreeU + 1}, (_, i) => atV(i)), u);
}
function bernsteinEvaluation(net: readonly Xyz[], degreeU: number, degreeV: number, u: number, v: number): Xyz {
    const choose = (n: number, i: number) => i === 0 || i === n ? 1 : n === 2 ? 2 : 1;
    const sum = [0, 0, 0];
    net.forEach((point, k) => {
        const i = Math.floor(k / (degreeV + 1)), j = k % (degreeV + 1);
        const weight = choose(degreeU, i) * (1 - u) ** (degreeU - i) * u ** i
            * choose(degreeV, j) * (1 - v) ** (degreeV - j) * v ** j;
        for (let axis = 0; axis < 3; axis++) sum[axis] += point[axis] * weight;
    });
    return sum as unknown as Xyz;
}

describe('patch evaluation guided examples', () => {
    it('uses the three real chapter section identities and complete bilingual frames', () => {
        expect(sections).toEqual(['tensor-decasteljau', 'properties', 'tensor-derivatives']);
        expect(sections.every(section => patchChapterSectionIds.includes(section))).toBe(true);
        for (const section of sections) {
            const lesson = patchGuidedExamplesEvaluation[section];
            expect(lesson.steps.length).toBeGreaterThanOrEqual(1);
            for (const step of lesson.steps) {
                expect(step.frames?.length).toBeGreaterThanOrEqual(2);
                expect(step.scene?.actions[0]).toMatchObject({kind: 'prepared-scene', source: 'lesson-patch-fixture'});
                for (const item of step.frames ?? []) {
                    expect(item.title.sl.trim()).not.toBe('');
                    expect(item.title.en.trim()).not.toBe('');
                    expect(item.body?.sl.trim()).not.toBe('');
                    expect(item.body?.en.trim()).not.toBe('');
                }
            }
        }
    });

    it('runs the two synchronous evaluation actions in either de Casteljau order and restores the graph on close', () => {
        const {graph, view, capabilities} = mount(TensorDeCasteljauGraph);
        const lesson = patchGuidedExamplesEvaluation['tensor-decasteljau'];
        const initial = graph.state;
        const session = new LessonSession(lesson, capabilities);
        act(() => session.start());
        const action = lesson.steps[0].scene!.actions[0];
        if (action.kind !== 'prepared-scene' || action.source !== 'lesson-patch-fixture' || action.patch.kind !== 'tensor') throw new Error('Expected the tensor de Casteljau fixture.');
        const net = action.patch.net.map(item => [item.x, item.y, item.z] as const);
        const expectedRows = stagedEvaluation(net, 2, 2, 0.25, 0.5, 'u');
        const expectedColumns = stagedEvaluation(net, 2, 2, 0.25, 0.5, 'v');
        const expectedBernstein = bernsteinEvaluation(net, 2, 2, 0.25, 0.5);
        closeVector(expectedRows, [0.25, 0.5, 0.75]);
        closeVector(expectedColumns, expectedBernstein);
        closeVector(expectedRows, expectedBernstein);
        expect(graph.state).toMatchObject({m: 2, n: 2, u: 0.25, v: 0.5, showDeCasteljau: true});
        expectPatchInView(view.last);
        const rows = view.last.markers.find(marker => marker.role === 'evaluated')!.xyz;
        closeVector(rows, expectedRows);
        act(() => graph.setDecasteljauOrder('columns'));
        const columns = view.last.markers.find(marker => marker.role === 'evaluated')!.xyz;
        closeVector(columns, expectedColumns);
        closeVector(columns, rows);
        expect(view.last.polylines.some(line => line.role === 'construction')).toBe(true);
        expect(view.last.polylines.some(line => line.role === 'construction-2')).toBe(true);
        act(() => session.close());
        expect(graph.state).toEqual(initial);
    });

    it('keeps the sampled patch within the stated height range and checks affine invariance numerically', () => {
        const {graph, view, capabilities} = mount(TensorPatchGraph);
        const initial = graph.state;
        const session = new LessonSession(patchGuidedExamplesEvaluation.properties, capabilities);
        act(() => session.start());
        expect(graph.state).toMatchObject({m: 2, n: 2, u: 0.5, v: 0.5, showControlNet: true});
        expectPatchInView(view.last);
        const z = Array.from(view.last.mesh!.positions).filter((_, index) => index % 3 === 2);
        expect(z.length).toBeGreaterThan(0);
        expect(z.every(Number.isFinite)).toBe(true);
        expect(Math.min(...z)).toBeCloseTo(0, 5);
        expect(Math.max(...z)).toBeCloseTo(1, 5);
        const center = view.last.markers.find(marker => marker.role === 'evaluated')!.xyz;
        closeVector(center, [0.5, 0.5, 1]);
        act(() => session.next());
        act(() => session.next());
        expect(graph.state).toMatchObject({m: 1, n: 1, u: 0.5, v: 0.5});
        expectPatchInView(view.last);
        const saddle = view.last.markers.find(marker => marker.role === 'evaluated')!.xyz;
        closeVector(saddle, [0.5, 0.5, 0]);
        act(() => session.next());
        act(() => session.next());
        expect(graph.state).toMatchObject({m: 2, n: 2, u: 0.5, v: 0.5});
        const transformedCenter = view.last.markers.find(marker => marker.role === 'evaluated')!.xyz;
        expectPatchInView(view.last);
        closeVector(transformedCenter, [0.5, 0.5, 3]);
        const mappedNet = graph.state.net.flat().map(([x, y, z]) => [x, y, z] as const);
        closeVector(bernsteinEvaluation(mappedNet, 2, 2, 0.5, 0.5), transformedCenter);
        act(() => session.close());
        expect(graph.state).toEqual(initial);
    });

    it('draws the saddle partials, tangent plane, normal and nonzero twist from the lesson fixture', () => {
        const {graph, view, capabilities} = mount(TensorDerivativesGraph);
        const initial = graph.state;
        const session = new LessonSession(patchGuidedExamplesEvaluation['tensor-derivatives'], capabilities);
        act(() => session.start());
        expect(graph.state).toMatchObject({m: 1, n: 1, u: 0.5, v: 0.5, showTangentPlane: true, showNormal: true, showTwist: true});
        expect(view.last.planes).toHaveLength(1);
        const origin = view.last.markers.find(marker => marker.role === 'evaluated')!.xyz;
        closeVector(origin, [0.5, 0.5, 0.25]);
        const fixture = patchGuidedExamplesEvaluation['tensor-derivatives'].steps[0].scene!.actions[0];
        if (fixture.kind !== 'prepared-scene' || fixture.source !== 'lesson-patch-fixture' || fixture.patch.kind !== 'tensor') throw new Error('Expected the bilinear saddle fixture.');
        const [p00, p01, p10, p11] = fixture.patch.net.map(item => [item.x, item.y, item.z] as const);
        const bilinearPoint = (u: number, v: number): Xyz => [0, 1, 2].map(axis =>
            p00[axis] * (1 - u) * (1 - v) + p10[axis] * u * (1 - v) + p01[axis] * (1 - u) * v + p11[axis] * u * v) as unknown as Xyz;
        const epsilon = 1e-6;
        const numericU = bilinearPoint(0.5 + epsilon, 0.5).map((value, i) => (value - bilinearPoint(0.5 - epsilon, 0.5)[i]) / (2 * epsilon));
        const numericV = bilinearPoint(0.5, 0.5 + epsilon).map((value, i) => (value - bilinearPoint(0.5, 0.5 - epsilon)[i]) / (2 * epsilon));
        const mixed = p11.map((value, i) => value - p10[i] - p01[i] + p00[i]);
        const line = (role: string) => view.last.polylines.find(item => item.role === role)!.points;
        for (const role of ['vector-u', 'vector-v', 'normal', 'twist']) expect(line(role)).toHaveLength(2);
        const du = line('vector-u')[1].map((value, i) => value - origin[i]);
        const dv = line('vector-v')[1].map((value, i) => value - origin[i]);
        direction(du, numericU);
        direction(dv, numericV);
        direction(line('normal')[1].map((value, i) => value - origin[i]), [numericU[1] * numericV[2] - numericU[2] * numericV[1], numericU[2] * numericV[0] - numericU[0] * numericV[2], numericU[0] * numericV[1] - numericU[1] * numericV[0]]);
        direction(line('twist')[1].map((value, i) => value - origin[i]), mixed);
        act(() => session.close());
        expect(graph.state).toEqual(initial);
    });
});
