import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims} from '../../graphs/base/realGraphTestHarness';
import {FakeSurfaceView} from '../../graphs/patches/FakeSurfaceView';
import TensorPatchGraph from '../../graphs/patches/TensorPatchGraph';
import {LessonSession} from '../runtime/LessonSession';
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
        expect(view.last.polylines.filter(line => line.role === 'net')).toHaveLength(fixture.patch.m + fixture.patch.n + 2);

        act(() => session.close());
        expect(graph.state.m).toBe(3);
        expect(session.snapshot().status).toBe('closed');
    });

    it('stops the moving cross-section sweep and restores the starting scene when closed', () => {
        const {graph, scheduler, capabilities} = mount();
        const initial = graph.state;
        const lesson = patchGuidedExamplesBasics['curve-to-patch'];
        const session = new LessonSession(lesson, capabilities);
        act(() => session.start());
        act(() => session.applyAnimation('patch-v-sweep', 'play'));
        expect(scheduler.tick(500)).toBe(true);
        expect(scheduler.tick(500)).toBe(true);
        expect(graph.state.v).toBeGreaterThan(0.5);
        act(() => session.close());
        expect(scheduler.pending.size).toBe(0);
        expect(graph.state).toEqual(initial);
    });
});
