import {afterEach, describe, expect, it} from 'vitest';
import {JsxSurfaceView} from './jsxSurfaceView';
import {makeCameraModel, projectToScreen} from './jsxProjection';
import type {RasterServices} from './jsxCapture';
import type {LabelLayout, SurfaceScene, Xyz} from './surfaceScene';

/** One big facet at z = 0.5 seen nearly edge-on, a control net below it and three labels: hidden, off-screen, shown. */
function sceneWith(overrides: Partial<SurfaceScene> = {}): SurfaceScene {
    const points = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y], i) => ({id: `p${i}`, xyz: [x, y, -1] as Xyz}));
    return {
        revision: 1,
        points,
        polylines: [{id: 'net', role: 'net', points: [...points.map(p => p.xyz), points[0].xyz]}],
        mesh: {positions: [-20, -20, 0.5, 20, -20, 0.5, 0, 20, 0.5], faces: [0, 1, 2], visible: true},
        markers: [],
        labels: [
            {id: 'under', text: 'U', anchor: [0, 0, -1]},
            {id: 'far', text: 'F', anchor: [500, 0, 0]},
            {id: 'above', text: 'A_{1}', anchor: [2, 0, 1.5]},
        ],
        camera: {az: 0, el: 0.2, distance: 12, projection: 'perspective', target: [0, 0, 0]},
        interaction: {zMode: false, editable: true},
        ...overrides,
    };
}

const SIZE = {width: 640, height: 480};

function host(): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', {configurable: true, value: SIZE.width});
    Object.defineProperty(el, 'clientHeight', {configurable: true, value: SIZE.height});
    document.body.appendChild(el);
    return el;
}

const SVG_URL_PREFIX = 'data:image/svg+xml;charset=utf-8,';

/** Image and canvas stand-ins: jsdom decodes no image and draws no canvas. `log` collects the SVG documents drawn. */
function stubServices(log: string[] = []): RasterServices {
    return {
        pixelRatio: 2,
        loadImage: async url => {
            expect(url.startsWith(SVG_URL_PREFIX)).toBe(true);
            log.push(decodeURIComponent(url.slice(SVG_URL_PREFIX.length)));
            return {} as CanvasImageSource;
        },
        createCanvas: (width, height) => ({
            width, height,
            getContext: () => ({fillRect: () => undefined, drawImage: () => undefined, fillStyle: ''}),
            toDataURL: (type: string) => `data:${type};base64,STUB-${width}x${height}`,
        }) as unknown as HTMLCanvasElement,
    };
}

async function mount(scene = sceneWith(), services?: RasterServices) {
    const view = new JsxSurfaceView(services);
    const layouts: LabelLayout[][] = [];
    view.onLayout(labels => layouts.push(labels));
    view.reconcile(scene);
    await view.attach(host());
    view.flush();
    return {view, layouts};
}
const visibility = (layout: LabelLayout[]) => Object.fromEntries(layout.map(l => [l.id, l.visible]));

afterEach(() => { document.body.innerHTML = ''; });

describe('JsxSurfaceView label layout', () => {
    it('delivers the projected, occlusion-tested layout of the first frame', async () => {
        const scene = sceneWith();
        const {view, layouts} = await mount(scene);
        expect(layouts).toHaveLength(1);
        expect(visibility(layouts[0])).toEqual({under: false, far: false, above: true});
        const model = makeCameraModel(scene.camera, SIZE);
        for (const label of scene.labels) {
            const p = projectToScreen(model, ...label.anchor);
            const delivered = layouts[0].find(l => l.id === label.id)!;
            expect([delivered.x, delivered.y, delivered.text]).toEqual([p.x, p.y, label.text]);
        }
        view.dispose();
    });

    it('delivers only when the layout changes, and a changed one at once', async () => {
        const scene = sceneWith();
        const {view, layouts} = await mount(scene);
        view.reconcile({...scene});
        view.flush();
        expect(layouts).toHaveLength(1);
        view.reconcile({...scene, mesh: {...scene.mesh!, visible: false}});
        view.flush();
        expect(layouts).toHaveLength(2);
        expect(visibility(layouts[1]).under).toBe(true);
        view.reconcile({...scene, camera: {...scene.camera, az: 1.2}});
        view.flush();
        expect(layouts).toHaveLength(3);
        expect(layouts[2].find(l => l.id === 'above')!.x).not.toBeCloseTo(layouts[1].find(l => l.id === 'above')!.x, 1);
        view.reconcile({...scene, labels: [...scene.labels, {id: 'new', text: 'N', anchor: [0, 0, 1]}], revision: 2});
        view.flush();
        expect(layouts).toHaveLength(4);
        expect(layouts[3].map(l => l.id)).toContain('new');
        view.dispose();
    });

    it('gives a new subscriber the current layout on the next frame, and nobody after unsubscribe or dispose', async () => {
        const scene = sceneWith();
        const {view, layouts} = await mount(scene);
        const late: LabelLayout[][] = [];
        const off = view.onLayout(labels => late.push(labels));
        view.reconcile({...scene});
        view.flush();
        expect(late).toHaveLength(1);
        expect(late[0]).toEqual(layouts[0]);
        off();
        view.reconcile({...scene, camera: {...scene.camera, az: 0.4}});
        view.flush();
        expect(late).toHaveLength(1);
        const before = layouts.length;
        view.dispose();
        view.reconcile(scene);
        expect(layouts).toHaveLength(before);
    });

    it('delivers an empty layout once for a scene without labels', async () => {
        const {view, layouts} = await mount(sceneWith({labels: []}));
        expect(layouts).toEqual([[]]);
        view.dispose();
    });
});

describe('JsxSurfaceView capture', () => {
    it('returns a PNG data URL, the size and the label layout of the drawn frame', async () => {
        const svgs: string[] = [];
        const {view, layouts} = await mount(sceneWith(), stubServices(svgs));
        const capture = await view.capture();
        expect(capture.dataUrl).toBe('data:image/png;base64,STUB-1280x960');
        expect([capture.width, capture.height]).toEqual([SIZE.width, SIZE.height]);
        expect(capture.labels).toEqual(layouts[0]);
        expect(svgs).toHaveLength(1);
        view.dispose();
    });

    it('draws the current geometry: a moved camera changes the image and the labels', async () => {
        const svgs: string[] = [];
        const scene = sceneWith();
        const {view} = await mount(scene, stubServices(svgs));
        const first = await view.capture();
        view.reconcile({...scene, camera: {...scene.camera, az: 0.9}});
        const second = await view.capture();
        expect(svgs[1]).not.toBe(svgs[0]);
        expect(second.labels.find(l => l.id === 'above')!.x).not.toBeCloseTo(first.labels.find(l => l.id === 'above')!.x, 1);
        view.dispose();
    });

    it('captures a standalone SVG without anything that could taint the canvas', async () => {
        const svgs: string[] = [];
        const {view} = await mount(sceneWith(), stubServices(svgs));
        await view.capture();
        const doc = new DOMParser().parseFromString(svgs[0], 'image/svg+xml');
        expect(doc.querySelector('parsererror')).toBeNull();
        const root = doc.documentElement;
        expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
        expect([root.getAttribute('width'), root.getAttribute('height'), root.getAttribute('viewBox')]).toEqual(['640', '480', '0 0 640 480']);
        expect(root.querySelectorAll('path').length).toBeGreaterThan(3);
        expect(root.querySelector('foreignObject, image, script, use, style')).toBeNull();
        const refs = Array.from(root.querySelectorAll('*')).flatMap(el => Array.from(el.attributes))
            .filter(a => /^(href|xlink:href|src)$/.test(a.name) || /url\((?!["']?#)/.test(a.value));
        expect(refs.map(a => `${a.name}=${a.value}`).slice(0, 5)).toEqual([]);
        view.dispose();
    });

    it('rejects before attach and after dispose, and when the browser cannot draw', async () => {
        const unattached = new JsxSurfaceView(stubServices());
        unattached.reconcile(sceneWith());
        await expect(unattached.capture()).rejects.toThrow(/not attached/);
        const {view} = await mount(sceneWith(), stubServices());
        view.dispose();
        await expect(view.capture()).rejects.toThrow(/not attached/);
        const noContext: RasterServices = {...stubServices(), createCanvas: () => ({getContext: () => null}) as unknown as HTMLCanvasElement};
        const {view: second} = await mount(sceneWith(), noContext);
        await expect(second.capture()).rejects.toThrow(/cannot draw/);
        second.dispose();
    });
});
