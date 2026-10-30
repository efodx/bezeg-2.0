/**
 * Test support for the framing checks of the JSXGraph surface view: the real patch graphs' scenes (stored and fitted
 * cameras, at a narrow and a wide host) and a reader that measures where a `JsxSurfaceView` actually put them (SVG
 * path data and point3d coordinates, not the pure projection).
 */
import {act} from '@testing-library/react';
import {createGraph, mountGraph, surfaceViewOf} from '../base/realGraphTestHarness';
import type {DemonstrationId} from '../../demonstrations';
import {defaultPatchPresets, defaultTriangularPatchPresets, derivativesStartingPatches, joinStartingScenes, type DefaultPatchPreset} from './patchPresetCollections';
import type {PatchCollectionPresetData} from './patchDto';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
import type {SurfaceScene, Xyz} from './surface-view/surfaceScene';
import type {CameraPresetName} from './surface-view/surfaceMath';

export interface FramingViewport {
    name: string;
    width: number;
    height: number;
}
export const NARROW: FramingViewport = {name: 'narrow 390x844', width: 390, height: 844};
export const DESKTOP: FramingViewport = {name: 'desktop 1440x1000', width: 1440, height: 1000};
export const FRAMING_VIEWPORTS = [NARROW, DESKTOP];

export interface FramingCase {
    name: string;
    scene: SurfaceScene;
    /** The viewports to check: a fitted camera only at the host shape it was fitted for. */
    viewports: FramingViewport[];
}

interface FittingGraph {
    resetView(): void;
    applyCameraPreset(name: CameraPresetName): void;
    importPresetData(data: PatchCollectionPresetData): void;
}

function sizeHost(host: HTMLElement, viewport: FramingViewport): void {
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: viewport.width});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: viewport.height});
}

const last = (view: {scenes: SurfaceScene[]}): SurfaceScene => view.scenes[view.scenes.length - 1];

const SOURCES: Array<{id: DemonstrationId; label: string; presets: Array<{name: string; data: () => PatchCollectionPresetData}>}> = [
    {id: 'patch-tensor', label: 'tensor', presets: defaultPatchPresets.map((p: DefaultPatchPreset) => ({name: p.id, data: p.data}))},
    {id: 'patch-triangular', label: 'triangular', presets: defaultTriangularPatchPresets.map(p => ({name: p.id, data: p.data}))},
    {id: 'patch-decasteljau', label: 'decasteljau', presets: defaultPatchPresets.map(p => ({name: p.id, data: p.data}))},
    {id: 'patch-derivatives', label: 'derivatives', presets: derivativesStartingPatches.map(p => ({name: p.id, data: p.data}))},
    {id: 'patch-subdivision', label: 'subdivision', presets: defaultPatchPresets.map(p => ({name: p.id, data: p.data}))},
    {id: 'patch-joins', label: 'joins', presets: joinStartingScenes.map(p => ({name: p.id, data: p.data}))},
];

/**
 * Per patch route: the scene of the route's default Preset, of every stored Preset (each with its stored camera) and
 * of the fit-to-host result and the four camera presets at both hosts. The teapot capstone is `patch-joins`' `join-teapot`.
 */
export function collectFramingCases(): FramingCase[] {
    const cases: FramingCase[] = [];
    for (const source of SOURCES) {
        const graph = createGraph(source.id);
        mountGraph(graph);
        const view = surfaceViewOf(graph)!;
        const fitting = graph as unknown as FittingGraph;
        const tag = (preset: string, what: string): string => `${source.label}/${preset}/${what}`;
        cases.push({name: tag('default', 'stored'), scene: last(view), viewports: FRAMING_VIEWPORTS});
        source.presets.forEach((preset, index) => {
            act(() => fitting.importPresetData(preset.data()));
            cases.push({name: tag(preset.name, 'stored'), scene: last(view), viewports: FRAMING_VIEWPORTS});
            // Camera presets and fit-to-host are exercised on the first Preset and on the capstone only, to bound the cost.
            if (index > 0 && preset.name !== 'join-teapot') return;
            for (const viewport of FRAMING_VIEWPORTS) {
                sizeHost(view.attached!, viewport);
                act(() => fitting.resetView());
                cases.push({name: tag(preset.name, `fit ${viewport.name}`), scene: last(view), viewports: [viewport]});
                if (preset.name === 'join-teapot') continue;
                for (const name of ['front', 'top', 'side', 'isometric'] as const) {
                    act(() => fitting.applyCameraPreset(name));
                    cases.push({name: tag(preset.name, `${name} ${viewport.name}`), scene: last(view), viewports: [viewport]});
                }
            }
        });
    }
    return cases;
}

export interface ScreenSample {
    world: Xyz;
    x: number;
    y: number;
}

interface Internals {
    draw: {
        elements: Array<{rendNode?: SVGElement}>;
        markers: Array<{element2D: {coords: {usrCoords: number[]}}}>;
        points: Map<string, {element2D: {coords: {usrCoords: number[]}}}>;
    };
    pool: {verts: Float64Array; tris: Uint32Array; planes: Uint32Array; segs: Uint32Array; segRoles: string[]};
}

const numbersIn = (d: string): number[] => (d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number);

export interface JsxMeasurement {
    /** Every drawn vertex and point, as JSXGraph's SVG (path data) and point3d elements have it. */
    samples: ScreenSample[];
    /** Screen positions of the segment endpoints by role. */
    segmentSamples: Array<{role: string; sample: ScreenSample}>;
}

/** Mounts a `JsxSurfaceView` of the scene on a host of the viewport's size and reads what it drew. */
export async function measureJsx(scene: SurfaceScene, viewport: FramingViewport): Promise<JsxMeasurement> {
    const host = document.createElement('div');
    sizeHost(host, viewport);
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    view.reconcile(scene);
    await view.attach(host);
    view.flush();
    try {
        const {draw, pool} = view as unknown as Internals;
        const samples: ScreenSample[] = [];
        const segmentSamples: JsxMeasurement['segmentSamples'] = [];
        const at = (i: number): Xyz => [pool.verts[3 * i], pool.verts[3 * i + 1], pool.verts[3 * i + 2]];
        const read = (element: number, vertices: number[]): ScreenSample[] => {
            const values = numbersIn(draw.elements[element].rendNode?.getAttribute('d') ?? '');
            if (values.length < 2 * vertices.length) throw new Error(`path of element ${element} has ${values.length / 2} vertices, expected ${vertices.length}`);
            return vertices.map((vertex, k) => ({world: at(vertex), x: values[2 * k], y: values[2 * k + 1]}));
        };
        let e = 0;
        for (let t = 0; t < pool.tris.length; t += 3, e++) samples.push(...read(e, [pool.tris[t], pool.tris[t + 1], pool.tris[t + 2]]));
        for (let q = 0; q < pool.planes.length; q += 4, e++) samples.push(...read(e, [pool.planes[q], pool.planes[q + 1], pool.planes[q + 2], pool.planes[q + 3]]));
        for (let s = 0; s < pool.segs.length; s += 2, e++) {
            const ends = read(e, [pool.segs[s], pool.segs[s + 1]]);
            samples.push(...ends);
            for (const sample of ends) segmentSamples.push({role: pool.segRoles[s / 2], sample});
        }
        const fromBoard = (xyz: Xyz, u: number[]): ScreenSample => ({world: xyz, x: u[1] + viewport.width / 2, y: viewport.height / 2 - u[2]});
        scene.markers.forEach((m, i) => samples.push(fromBoard(m.xyz, draw.markers[i].element2D.coords.usrCoords)));
        for (const p of scene.points) samples.push(fromBoard(p.xyz, draw.points.get(p.id)!.element2D.coords.usrCoords));
        return {samples, segmentSamples};
    } finally {
        view.dispose();
        host.remove();
    }
}

/** The world points that make up the control net of a scene (its points and net lines; the teapot's boundary curves if it has no net). */
export function controlNetPoints(scene: SurfaceScene): Xyz[] {
    const net = scene.polylines.filter(l => l.role === 'net');
    const lines = net.length ? net : scene.polylines.filter(l => l.role === 'boundary');
    return [...scene.points.map(p => p.xyz), ...lines.flatMap(l => l.points)];
}

export interface Bounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export function screenBounds(points: ReadonlyArray<{x: number; y: number}>): Bounds {
    return {
        minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
        minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)),
    };
}

/** Bounds of the control net as JSXGraph drew it: each net world point looked up among the measured samples. */
export function measuredNetBounds(scene: SurfaceScene, measurement: JsxMeasurement): Bounds {
    const key = (p: readonly number[]): string => p.map(v => v.toFixed(9)).join(',');
    const byWorld = new Map<string, ScreenSample>();
    for (const sample of measurement.samples) byWorld.set(key(sample.world), sample);
    const found = controlNetPoints(scene).map(p => {
        const sample = byWorld.get(key(p));
        if (!sample) throw new Error(`control net point ${p.join(',')} was not drawn`);
        return sample;
    });
    return screenBounds(found);
}

/**
 * The scenes of the depth check: tensor, triangular (cubic) and joins (first Preset) and the teapot capstone, each at the four
 * camera presets on the desktop host, fitted first as a user's "reset view" would.
 */
export function collectDepthCases(): FramingCase[] {
    const cases: FramingCase[] = [];
    const wanted: Array<{label: string; preset: (name: string, index: number) => boolean}> = [
        {label: 'tensor', preset: (_, i) => i === 0},
        // The cubic preset: the linear patch's net lies in its surface, so a depth check on it has nothing to decide.
        {label: 'triangular', preset: (_, i) => i === 2},
        {label: 'joins', preset: (name, i) => i === 0 || name === 'join-teapot'},
    ];
    for (const {label, preset} of wanted) {
        const source = SOURCES.find(s => s.label === label)!;
        const graph = createGraph(source.id);
        mountGraph(graph);
        const view = surfaceViewOf(graph)!;
        const fitting = graph as unknown as FittingGraph;
        source.presets.forEach((p, index) => {
            if (!preset(p.name, index)) return;
            act(() => fitting.importPresetData(p.data()));
            sizeHost(view.attached!, DESKTOP);
            act(() => fitting.resetView());
            for (const name of ['front', 'top', 'side', 'isometric'] as const) {
                act(() => fitting.applyCameraPreset(name));
                cases.push({name: `${label}/${p.name}/${name}`, scene: last(view), viewports: [DESKTOP]});
            }
        });
    }
    return cases;
}
