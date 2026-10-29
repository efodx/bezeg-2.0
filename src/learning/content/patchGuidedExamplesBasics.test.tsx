import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims} from '../../graphs/base/realGraphTestHarness';
import {FakeSurfaceView} from '../../graphs/patches/FakeSurfaceView';
import TensorPatchGraph from '../../graphs/patches/TensorPatchGraph';
import {LessonSession} from '../runtime/LessonSession';
import {GuidedLesson} from '../runtime/GuidedLesson';
import type {LessonPatchFixture} from '../model';
import {patchGuidedExamplesBasics, type PatchBasicExampleSectionId} from './patchGuidedExamplesBasics';
import type {AnimationScheduler} from '../runtime/animation';

beforeAll(installBoardShims);

class ManualScheduler implements AnimationScheduler {
    private next = 1;
    private time = 0;
    readonly pending = new Map<number, FrameRequestCallback>();
    request(callback: FrameRequestCallback) { const handle = this.next++; this.pending.set(handle, callback); return handle; }
    cancel(handle: number) { this.pending.delete(handle); }
    tick(dt: number) {
        const [handle, callback] = [...this.pending][0] ?? [];
        if (handle === undefined || !callback) return false;
        this.pending.delete(handle);
        this.time += dt;
        act(() => callback(this.time));
        return true;
    }
}

const sections = Object.keys(patchGuidedExamplesBasics) as PatchBasicExampleSectionId[];
function evaluate(fixture: Extract<LessonPatchFixture, {kind: 'tensor'}>, u: number, v: number): number[] {
    const bernstein = (degree: number, t: number) => Array.from({length: degree + 1}, (_, i) => {
        const choose = degree === 1 ? 1 : i === 0 || i === degree ? 1 : degree;
        return choose * (1 - t) ** (degree - i) * t ** i;
    });
    const bu = bernstein(fixture.m, u), bv = bernstein(fixture.n, v);
    return fixture.net.reduce((sum, point, index) => {
        const i = Math.floor(index / (fixture.n + 1)), j = index % (fixture.n + 1), weight = bu[i] * bv[j];
        return sum.map((value, axis) => value + weight * [point.x, point.y, point.z][axis]);
    }, [0, 0, 0]);
}

function expectedIsoControls(fixture: Extract<LessonPatchFixture, {kind: 'tensor'}>, v: number): number[][] {
    const bernstein = (degree: number, t: number) => Array.from({length: degree + 1}, (_, i) => {
        const choose = degree === 1 ? 1 : i === 0 || i === degree ? 1 : degree;
        return choose * (1 - t) ** (degree - i) * t ** i;
    });
    const weights = bernstein(fixture.n, v);
    return Array.from({length: fixture.m + 1}, (_, i) => weights.reduce((point, weight, j) => {
        const control = fixture.net[i * (fixture.n + 1) + j];
        return point.map((value, axis) => value + weight * [control.x, control.y, control.z][axis]);
    }, [0, 0, 0]));
}

function mount() {
    const view = new FakeSurfaceView();
    const scheduler = new ManualScheduler();
    const graph = new TensorPatchGraph({viewFactory: () => view, scheduler});
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, scheduler, capabilities: graph.getLessonCapabilities()};
}

describe('first four patch chapter guided examples', () => {
    it('keeps four stable, distinct section identities with bilingual multi-frame teaching', () => {
        expect(sections).toEqual(['curve-to-patch', 'bilinear-patch', 'control-net', 'boundary-iso-curves']);
        const lessons = sections.map(section => patchGuidedExamplesBasics[section]);
        expect(new Set(lessons.map(item => item.id)).size).toBe(4);
        for (const item of lessons) {
            expect(item.demonstrationId).toBe('patch-tensor');
            expect(item.steps[0].scene?.actions[0]).toMatchObject({kind: 'prepared-scene', source: 'lesson-patch-fixture'});
            expect(item.steps[0].frames?.length).toBeGreaterThanOrEqual(2);
            for (const frame of item.steps[0].frames ?? []) {
                expect(frame.title.sl.trim()).not.toBe('');
                expect(frame.title.en.trim()).not.toBe('');
                expect(frame.body?.sl.trim()).not.toBe('');
                expect(frame.body?.en.trim()).not.toBe('');
            }
        }
    });

    it.each(sections)('%s scene prepares measurable tensor geometry on TensorPatchGraph', section => {
        const {graph, view, capabilities} = mount();
        const lesson = patchGuidedExamplesBasics[section];
        const fixture = lesson.steps[0].scene?.actions[0];
        expect(fixture?.kind).toBe('prepared-scene');
        if (fixture?.kind !== 'prepared-scene' || fixture.source !== 'lesson-patch-fixture' || fixture.patch.kind !== 'tensor') throw new Error('Expected a tensor lesson fixture.');
        const u = section === 'control-net' ? 0.25 : 0.5;
        const v = 0.5;
        const session = new LessonSession(lesson, capabilities);
        act(() => session.start());

        expect(graph.state.m).toBe(fixture.patch.m);
        expect(graph.state.n).toBe(fixture.patch.n);
        expect(graph.state.u).toBe(u);
        expect(graph.state.v).toBe(v);
        expect(graph.state.showControlNet).toBe(true);
        expect(graph.state.showIsoCurves).toBe(true);
        expect(graph.state.showBoundaryCurves).toBe(true);
        expect(graph.state.camera.distance).toBe(5.5);
        expect(view.last.mesh?.positions.length).toBeGreaterThan(0);
        expect(view.last.points).toHaveLength((fixture.patch.m + 1) * (fixture.patch.n + 1));
        expect(view.last.markers.find(marker => marker.id === 'evaluated')?.xyz).toEqual(evaluate(fixture.patch, u, v).map(value => expect.closeTo(value, 12)));
        expect(view.last.polylines.filter(line => line.id.startsWith('net-row-') || line.id.startsWith('net-col-'))).toHaveLength(fixture.patch.m + fixture.patch.n + 2);

        act(() => session.close());
        expect(graph.state.m).toBe(3);
        expect(session.snapshot().status).toBe('closed');
    });

    it('stops the moving cross-section sweep and restores the starting scene when closed', () => {
        const {graph, view, scheduler, capabilities} = mount();
        const initial = graph.state;
        const lesson = patchGuidedExamplesBasics['curve-to-patch'];
        const session = new LessonSession(lesson, capabilities);
        act(() => session.start());
        expect(view.last.polylines.some(line => line.id === 'sweep-v-curve' || line.id === 'sweep-v-controls')).toBe(false);
        act(() => session.applyAnimation('patch-v-sweep', 'play'));
        const curveBefore = view.last.polylines.find(line => line.id === 'sweep-v-curve')?.points;
        const controlsBefore = view.last.polylines.find(line => line.id === 'sweep-v-controls')?.points;
        expect(curveBefore).toBeDefined();
        expect(controlsBefore).toBeDefined();
        expect(scheduler.tick(500)).toBe(true);
        expect(scheduler.tick(500)).toBe(true);
        expect(graph.state.v).toBeGreaterThan(0.5);
        expect(view.last.polylines.find(line => line.id === 'sweep-v-curve')?.points).not.toEqual(curveBefore);
        expect(view.last.polylines.find(line => line.id === 'sweep-v-controls')?.points).not.toEqual(controlsBefore);
        act(() => session.close());
        expect(scheduler.pending.size).toBe(0);
        expect(graph.state).toEqual(initial);
    });

    it('exposes the sweep through the chapter example Observe flow', () => {
        const {graph, view, scheduler, capabilities} = mount();
        function Harness() {
            const [graphActions, setGraphActions] = useState<{animationControls?: React.ReactNode}>();
            return <>
                <div data-testid="graph-actions">{graphActions?.animationControls}</div>
                <GuidedLesson lesson={patchGuidedExamplesBasics['curve-to-patch']} capabilities={capabilities}
                    onClose={() => undefined} registerGraphActions={setGraphActions}/>
            </>;
        }
        render(<Harness/>);

        fireEvent.click(screen.getByRole('button', {name: 'Naslednji okvir'}));
        fireEvent.click(screen.getByRole('button', {name: 'Opazuj na grafu'}));
        const controls = within(screen.getByTestId('graph-actions')).getByRole('group', {name: 'Kontrole animacije konstrukcije'});
        const [play] = within(controls).getAllByRole('button');
        fireEvent.click(play);

        expect(view.last.polylines.some(line => line.id === 'sweep-v-curve')).toBe(true);
        expect(view.last.polylines.some(line => line.id === 'sweep-v-controls')).toBe(true);
        act(() => expect(scheduler.tick(500)).toBe(true));
        act(() => expect(scheduler.tick(500)).toBe(true));
        expect(graph.state.v).toBeGreaterThan(0.5);
    });

    it('renders the nonplanar quadratic iso-curve control points computed from net rows', () => {
        const {view, capabilities} = mount();
        const lesson = patchGuidedExamplesBasics['boundary-iso-curves'];
        const fixture = lesson.steps[0].scene?.actions[0];
        if (fixture?.kind !== 'prepared-scene' || fixture.source !== 'lesson-patch-fixture' || fixture.patch.kind !== 'tensor') throw new Error('Expected the quadratic tensor fixture.');
        const session = new LessonSession(lesson, capabilities);
        act(() => session.start());
        act(() => {
            session.applyAnimation('patch-v-sweep', 'play');
            session.applyAnimation('patch-v-sweep', 'pause');
        });
        const controls = view.last.polylines.find(line => line.id === 'sweep-v-controls');
        if (!controls) throw new Error('Expected rendered moving iso-curve controls.');
        const expected = expectedIsoControls(fixture.patch, 0.5);
        expect(controls.points).toHaveLength(3);
        controls.points.forEach((point, i) => expect(point).toEqual(expected[i].map(value => expect.closeTo(value, 12))));
        expect(controls.points[1][2]).toBeCloseTo(0.6, 12);
        expect(controls.points[1][2]).not.toBeCloseTo(evaluate(fixture.patch, 0.5, 0.5)[2], 12);
        act(() => session.close());
    });
});
