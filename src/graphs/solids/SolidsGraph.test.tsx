import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {readFileSync, readdirSync} from 'node:fs';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {formatNumber} from '../../analysis/format';
import {enterNumber} from '../../inputs/testEntry';
import {renderMessage, setLanguage, t} from '../../localization';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {isClosed, type Solid} from '../../solids/solid';
import {DEFAULT_SOLIDS_STATE, MODES, MODE_SOLIDS, SOLID_IDS, type SolidsMode} from '../../solids/solidsModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {FakeSurfaceView} from '../patches/FakeSurfaceView';
import {assertFiniteScene} from '../patches/surface-view/surfaceScene';
import SolidsGraph from './SolidsGraph';
import {solidsPresetCollection} from './solidsPresetCollection';
import {drawSolids} from './solidsScene';

vi.mock('./solidsScene', async importOriginal => {
    const actual = await importOriginal<typeof import('./solidsScene')>();
    return {...actual, drawSolids: vi.fn(actual.drawSolids)};
});

beforeAll(installBoardShims);
afterEach(() => setLanguage('sl'));

class ExposedGraph extends SolidsGraph {
    get isReady() { return this.graphSession?.isReady === true; }
}

function mount(view = new FakeSurfaceView()) {
    const graph = new ExposedGraph({viewFactory: () => view, typeset: async () => undefined});
    const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, rendered};
}

const fmt = (value: number, digits: number) => formatNumber(value, 'sl', digits);
const row = (id: string): HTMLElement => {
    const element = document.querySelector<HTMLElement>(`[data-readout="${id}"]`);
    if (!element) throw new Error(`no readout row ${id}`);
    return element;
};
const value = (id: string): string => row(id).querySelector('dd')!.textContent!;
const label = (id: string): string => row(id).querySelector('dt')!.textContent!;
const slider = (name: string) => screen.getByRole<HTMLInputElement>('slider', {name});
const field = (name: string) => screen.getByRole<HTMLInputElement>('spinbutton', {name: t('number_field_label', {value0: name})});

/** Every triangle of the scene mesh, to check it is drawn from closed solids only (the drawing keeps the solids). */
const setMode = (graph: SolidsGraph, mode: SolidsMode) => act(() => graph.setMode(mode));
const drawnSolids = (graph: SolidsGraph): readonly Solid[] => drawSolids(graph.state).solids;

describe('mount, state change, unmount', () => {
    it('draws the default cube section as a mesh with finite coordinates and finishes ready', async () => {
        const {graph, view} = mount();
        await waitFor(() => expect(graph.isReady).toBe(true));
        expect(view.last.mesh!.faces.length).toBeGreaterThan(0);
        expect(view.last.interaction.editable).toBe(false);
        assertFiniteScene(view.last);
        expect(graph.state.mode).toBe('section');
    });

    it('rebuilds the mesh when the plane moves, and reuses the drawing when only the camera moves', () => {
        const {graph, view} = mount();
        const first = view.last;
        act(() => graph.setOffset(3));
        expect(view.last.revision).toBeGreaterThan(first.revision);
        expect(view.last.mesh).not.toBe(first.mesh);
        const moved = view.last;
        act(() => graph.setCameraAngle('az', 30));
        expect(view.last.mesh!.positions).toBe(moved.mesh!.positions);
        expect(view.last.camera.az).toBeCloseTo(30 * Math.PI / 180, 12);
        act(() => graph.resetView());
        assertFiniteScene(view.last);
    });

    it('draws the solids once for a geometry and not again for an orbit, a view reset or a rerender', () => {
        const {graph} = mount();
        const draws = () => vi.mocked(drawSolids).mock.calls.length;
        act(() => graph.setOffset(3));
        const base = draws();
        act(() => { graph.setCameraAngle('az', 30); graph.setCameraAngle('el', 20); graph.applyCameraPreset('top'); });
        act(() => graph.resetView());
        expect(draws(), 'the camera is not a geometry field').toBe(base);
        act(() => graph.setOffset(4));
        expect(draws(), 'a plane move draws again, once for the scene and the readouts').toBe(base + 1);
    });

    it('unmounting disposes the view', () => {
        const {graph, view, rendered} = mount();
        expect(view.disposed).toBe(0);
        rendered.unmount();
        expect(view.disposed).toBeGreaterThan(0);
        expect(() => graph.setOffset(5)).not.toThrow();
    });
});

describe('the four modes draw only closed meshes (acceptance 1, 2)', () => {
    const cases: Array<[SolidsMode, string]> = MODES.flatMap(mode => MODE_SOLIDS[mode].map((solid): [SolidsMode, string] => [mode, solid]));
    it.each(cases)('%s of %s: closed solids, a finite scene', (mode, solid) => {
        const {graph, view} = mount();
        act(() => graph.setState({mode, solid: solid as typeof SOLID_IDS[number]}));
        for (const drawn of drawnSolids(graph)) expect(isClosed(drawn), `${mode} ${solid}`).toBe(true);
        expect(drawnSolids(graph).length).toBeGreaterThan(0);
        expect(view.last.mesh!.faces.length).toBeGreaterThan(0);
        assertFiniteScene(view.last);
    });

    it('draws no mesh for an empty section and still keeps a finite scene', () => {
        const {graph, view} = mount();
        act(() => graph.setState({normal: [1, 1, 1], offset: 100}));
        assertFiniteScene(view.last);
        for (const drawn of drawnSolids(graph)) expect(isClosed(drawn)).toBe(true);
    });

    it('the mode select falls back to the first solid of the mode and a solid change keeps a consistent mode', () => {
        const {graph} = mount();
        act(() => graph.setSolid('sphere'));
        expect(graph.state).toMatchObject({solid: 'sphere', mode: 'volume'});
        act(() => graph.setMode('section'));
        expect(graph.state).toMatchObject({mode: 'section', solid: 'cube'});
        act(() => graph.setMode('stack'));
        expect(graph.state).toMatchObject({mode: 'stack', solid: 'cube'}); // the cube stays in stack mode
        act(() => graph.setSolid('cone'));
        expect(graph.state.mode).toBe('stack'); // the cone is the failing pair
        act(() => graph.setMode('revolve'));
        expect(graph.state.solid).toBe('cone');
        act(() => graph.setAxis('y'));
        expect(graph.state.axis).toBe('y');
        act(() => graph.setSolid('sphere'));
        expect(graph.state).toMatchObject({mode: 'revolve', axis: 'x'});
        act(() => graph.setMode('nonsense' as SolidsMode));
        expect(graph.state.mode).toBe('revolve');
    });

    it('the select in the panel changes the mode and offers only its solids', () => {
        const {graph} = mount();
        const mode = screen.getByRole<HTMLSelectElement>('combobox', {name: t('solids_graph_mode')});
        fireEvent.change(mode, {target: {value: 'revolve'}});
        expect(graph.state.mode).toBe('revolve');
        const solid = screen.getByRole<HTMLSelectElement>('combobox', {name: t('solids_graph_solid')});
        expect(Array.from(solid.options).map(o => o.value)).toEqual([...MODE_SOLIDS.revolve]);
    });
});

describe('the integer sliders and fields', () => {

    it('steps the disc count by keyboard in the field and on the range', () => {
        const {graph} = mount();
        setMode(graph, 'revolve');
        const name = t('solids_graph_discs');
        expect(graph.state.discs).toBe(10);
        fireEvent.keyDown(field(name), {key: 'ArrowUp'});
        expect(graph.state.discs).toBe(11);
        fireEvent.keyDown(field(name), {key: 'ArrowDown'});
        fireEvent.keyDown(field(name), {key: 'ArrowDown'});
        expect(graph.state.discs).toBe(9);
        fireEvent.keyDown(slider(name), {key: 'PageUp'});
        expect(graph.state.discs).toBe(19);
        fireEvent.keyDown(slider(name), {key: 'PageDown'});
        expect(graph.state.discs).toBe(9);
        fireEvent.keyDown(slider(name), {key: 'ArrowUp', shiftKey: true});
        expect(graph.state.discs).toBe(19);
        fireEvent.keyDown(slider(name), {key: 'PageUp'});
        fireEvent.keyDown(slider(name), {key: 'PageUp'});
        fireEvent.keyDown(slider(name), {key: 'PageUp'});
        fireEvent.keyDown(slider(name), {key: 'PageUp'});
        expect(graph.state.discs, 'the maximum is 60 and is never passed').toBe(59);
        fireEvent.keyDown(slider(name), {key: 'PageUp'});
        expect(graph.state.discs).toBe(60);
        fireEvent.keyDown(slider(name), {key: 'ArrowUp', shiftKey: true});
        expect(graph.state.discs).toBe(60);
        expect(slider(name).min).toBe('1');
        expect(slider(name).max).toBe('60');
        fireEvent.change(slider(name), {target: {value: '1'}}); // a touch drag to the minimum
        expect(graph.state.discs).toBe(1);
    });

    it('steps the plane offset by a quarter and the cursor by 2,5 percent', () => {
        const {graph} = mount();
        const offset = t('solids_graph_offset');
        fireEvent.keyDown(field(offset), {key: 'ArrowUp'});
        expect(graph.state.offset).toBe(3);
        expect(field(offset).value).toBe('0,75');
        fireEvent.keyDown(slider(offset), {key: 'PageDown'});
        expect(graph.state.offset).toBe(3 - 10);
        setMode(graph, 'stack');
        const cursor = t('solids_graph_cursor');
        expect(field(cursor).value).toBe('50');
        fireEvent.keyDown(field(cursor), {key: 'ArrowUp'});
        expect(graph.state.cursor).toBe(21);
        expect(field(cursor).value).toBe('52,5');
    });

    it('refuses the zero normal with a hint and leaves the state', () => {
        const {graph} = mount();
        const z = t('solids_graph_normal', {value0: 'z'});
        enterNumber(field(z), '0');
        expect(graph.state.normal).toEqual([0, 0, 1]);
        expect(screen.getByText(t('solids_graph_normal_zero'))).toBeTruthy();
        enterNumber(field(z), '3');
        expect(graph.state.normal).toEqual([0, 0, 3]);
        enterNumber(field(t('solids_graph_normal', {value0: 'x'})), '-4');
        expect(graph.state.normal).toEqual([-4, 0, 3]);
    });

    it('refuses typed values off the integer grid or outside the range, and snaps a typed offset to the quarter grid', () => {
        const {graph} = mount();
        const x = field(t('solids_graph_normal', {value0: 'x'}));
        enterNumber(x, '1,5');
        expect(graph.state.normal).toEqual([0, 0, 1]);
        enterNumber(x, '5');
        expect(graph.state.normal).toEqual([0, 0, 1]);
        enterNumber(field(t('solids_graph_normal', {value0: 'z'})), '4');
        expect(graph.state.normal[2]).toBe(4);
        const offset = field(t('solids_graph_offset'));
        enterNumber(offset, '0,3'); // not on the grid: rounded to the nearest quarter, not stored as 0,3
        expect(graph.state.offset).toBe(1);
        enterNumber(offset, '40');
        expect(graph.state.offset).toBe(1);
        setMode(graph, 'revolve');
        const discs = field(t('solids_graph_discs'));
        enterNumber(discs, '10,5');
        expect(graph.state.discs).toBe(10);
        enterNumber(discs, '61');
        expect(graph.state.discs).toBe(10);
        enterNumber(discs, '0');
        expect(graph.state.discs).toBe(10);
        enterNumber(discs, '12');
        expect(graph.state.discs).toBe(12);
    });

    it('hides the shear slider for the failing pair (the cone) and shows it for the sheared pair', () => {
        const {graph} = mount();
        setMode(graph, 'stack');
        expect(screen.queryByRole('slider', {name: t('solids_graph_shear')})).not.toBeNull();
        act(() => graph.setSolid('cone'));
        expect(graph.state.mode).toBe('stack');
        expect(screen.queryByRole('slider', {name: t('solids_graph_shear')})).toBeNull();
        expect(slider(t('solids_graph_cursor'))).toBeTruthy();
        act(() => graph.setSolid('cube'));
        act(() => graph.setShear(5));
        expect(graph.state.shear).toBe(5);
        expect(field(t('solids_graph_shear')).value).toBe('1,25');
    });

    it('ignores setters called with off-grid, out-of-range or non-integer values', () => {
        const {graph} = mount();
        const before = graph.state;
        act(() => { graph.setOffset(1.5); graph.setOffset(145); graph.setShear(13); graph.setCursor(0); graph.setCursor(40); graph.setDiscs(0); graph.setDiscs(61); graph.setDiscs(2.5); });
        expect(graph.state).toBe(before);
        expect(graph.setNormal(0, 5)).toBe(false);
        expect(graph.setNormal(2, 0)).toBe(false);
        expect(graph.state).toBe(before);
        act(() => graph.setAxis('y'));
        expect(graph.state.axis, 'the cube has no y-axis solid').toBe('x');
    });
});

describe('the readouts', () => {
    it('labels every row and gives side count and area of the section as text', () => {
        mount();
        expect(label('sides')).toBe(t('solids_graph_row_sides'));
        expect(value('sides')).toBe('4');
        expect(label('area')).toBe(t('solids_graph_row_area'));
        expect(value('area')).toBe('1');
        expect(label('kept-volume')).toBe(t('solids_graph_row_kept_volume'));
        expect(value('kept-volume')).toBe('0,5');
        document.querySelectorAll('[data-readout]').forEach(el => {
            expect(el.querySelector('dt')!.textContent!.trim().length).toBeGreaterThan(0);
            expect(el.querySelector('dd')!.textContent!.trim().length).toBeGreaterThan(0);
        });
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });

    it('shows the mesh volume next to the exact one, with decimal comma', () => {
        const {graph} = mount();
        act(() => graph.setState({mode: 'volume', solid: 'sphere'}));
        const readouts = drawSolids(graph.state).readouts;
        if (readouts.mode !== 'volume') throw new Error('mode');
        expect(label('volume-mesh')).toBe(t('solids_graph_row_mesh_volume'));
        expect(label('volume-exact')).toBe(t('solids_graph_row_exact_volume'));
        expect(value('volume-exact')).toBe(fmt(36 * Math.PI, 5));
        expect(value('volume-exact')).toBe('113,09734');
        expect(value('volume-mesh')).toBe(fmt(readouts.meshVolume, 5));
        expect(value('volume-mesh')).not.toBe(value('volume-exact')); // a k-gon sphere is smaller; both are shown
        expect(value('volume-mesh')).toMatch(/^\d{3},\d{5}$/);
        const rows = Array.from(document.querySelectorAll('[data-readout]')).map(el => el.getAttribute('data-readout'));
        expect(rows.indexOf('volume-exact') - rows.indexOf('volume-mesh')).toBe(1);
        expect(screen.getByText(t('solids_graph_mesh_note'))).toBeTruthy();
    });

    it('writes a true minus for a negative number', () => {
        expect(fmt(-0.5, 2)).toBe('−0,5');
        expect(formatNumber(-0.5, 'en', 2)).toBe('−0.5');
    });

    it('labels the stack rows by the pair and shows both exact volumes', () => {
        const {graph} = mount();
        act(() => graph.setState({mode: 'stack', solid: 'cone'}));
        expect(label('volume-0')).toBe(t('solids_graph_row_volume_of_mesh', {value0: t('solids_graph_name_cone')}));
        expect(label('exact-1')).toBe(t('solids_graph_row_volume_of_exact', {value0: t('solids_graph_name_cylinder')}));
        expect(value('exact-0')).toBe(fmt(12 * Math.PI, 5)); // the cone of radius 3 and height 4
        act(() => graph.setState({solid: 'cube'}));
        expect(label('volume-1')).toBe(t('solids_graph_row_volume_of_mesh', {value0: t('solids_graph_name_sheared')}));
    });

    it('follows a language switch in labels and number format', () => {
        const {graph} = mount();
        act(() => graph.setState({mode: 'volume', solid: 'sphere'}));
        expect(label('volume-exact')).toBe(sl.solids_graph_row_exact_volume);
        act(() => setLanguage('en'));
        expect(label('volume-exact')).toBe(en.solids_graph_row_exact_volume);
        expect(value('volume-exact')).toBe('113.09734');
        expect(screen.getByRole('combobox', {name: en.solids_graph_mode})).toBeTruthy();
        act(() => setLanguage('sl'));
        expect(value('volume-exact')).toBe('113,09734');
    });
});

describe('Preset', () => {
    it('round-trips a changed state through export, the collection check and import', () => {
        const {graph} = mount();
        act(() => graph.setState({mode: 'revolve', solid: 'parabola', axis: 'y', discs: 17}));
        const exported = JSON.parse(JSON.stringify(graph.exportPresetData()));
        const checked = solidsPresetCollection.check(exported);
        expect('data' in checked).toBe(true);
        const other = mount().graph;
        act(() => other.importPresetData('data' in checked ? checked.data : []));
        expect(other.state).toMatchObject({mode: 'revolve', solid: 'parabola', axis: 'y', discs: 17});
        expect(other.exportPresetData()).toEqual(graph.exportPresetData());
    });

    it('exports the default preset unchanged on a fresh graph', () => {
        const {graph} = mount();
        expect(graph.exportPresetData()[0][1]).toEqual({...graph.defaultPreset()[0][1], camera: graph.state.camera}); // the camera is fitted to the host
        expect(graph.state.cursor).toBe(DEFAULT_SOLIDS_STATE.cursor);
    });

    it('rejects an invalid import with a message that names the field and the accepted range', () => {
        const render_ = (data: unknown) => {
            const result = solidsPresetCollection.check(data);
            if (!('rejection' in result)) throw new Error('accepted');
            return renderMessage(result.rejection);
        };
        const good = JSON.parse(JSON.stringify(mount().graph.defaultPreset()));
        const bad = (patch: Record<string, unknown>) => [['Solids', {...good[0][1], ...patch}]];
        expect(render_(bad({offset: 1000}))).toBe(t('solids_graph_error_out_of_range', {value0: t('solids_graph_field_offset'), value1: '−144', value2: '144'}));
        expect(render_(bad({discs: 2.5}))).toContain(t('solids_graph_field_discs'));
        expect(render_(bad({normal: [0, 0, 0]}))).toBe(t('solids_graph_error_zero_normal'));
        expect(render_(bad({solid: 'torus'}))).toContain(t('solids_graph_field_solid'));
        expect(render_(bad({mode: 'section', solid: 'sphere'}))).toBe(t('solids_graph_error_inconsistent', {value0: t('solids_graph_field_mode'), value1: 'cube, triangular-prism, square-prism, square-pyramid'})); // the file values are the ids
        expect(render_('nonsense')).toBe(t('solids_graph_error_preset_shape'));
        expect(render_([])).toBe(t('solids_graph_error_preset_entries'));
        expect(render_([['Other', good[0][1]]])).toBe(t('solids_graph_error_preset_shape'));
        expect(solidsPresetCollection.checkGraphState!({initialized: true, mode: 'x'})).toBeDefined();
        expect(solidsPresetCollection.checkGraphState!({initialized: true})).toBeUndefined();
    });

    it('does not change the state when the graph is given an invalid state directly', () => {
        const {graph} = mount();
        const before = graph.state;
        act(() => graph.importPresetData([['Solids', {...DEFAULT_SOLIDS_STATE, offset: 1000}]]));
        expect(graph.state).toBe(before);
    });
});

describe('localization', () => {
    const keysOf = (catalog: Record<string, string>) => Object.keys(catalog).filter(key => key.startsWith('solids_graph_'));
    const placeholders = (text: string) => Array.from(new Set(Array.from(text.matchAll(/\{(\w+)\}/g), m => m[1]))).sort();
    const slText = sl as Record<string, string>;
    const enText = en as Record<string, string>;

    it('has the same solids_graph keys in the same order, with the same placeholder names, in both languages', () => {
        const keys = keysOf(slText);
        expect(keys.length).toBeGreaterThan(50);
        expect(keysOf(enText)).toEqual(keys);
        for (const key of keys) {
            expect(placeholders(enText[key]), key).toEqual(placeholders(slText[key]));
            expect(enText[key].length, key).toBeGreaterThan(0);
            expect(slText[key].length, key).toBeGreaterThan(0);
        }
    });

    it('uses every solids_graph key in the graph sources, and every key those sources name exists', () => {
        const dir = 'src/graphs/solids';
        const source = readdirSync(dir).filter(f => /\.tsx?$/.test(f) && !f.includes('.test.')).map(f => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
        const literals = new Set(Array.from(source.matchAll(/solids_graph_\w+/g), m => m[0]));
        const prefixes = Array.from(source.matchAll(/solids_graph_(\w*)\$\{/g), m => `solids_graph_${m[1]}`);
        const keys = keysOf(slText);
        const unused = keys.filter(key => !literals.has(key) && !prefixes.some(prefix => key.startsWith(prefix) && key.length > prefix.length));
        expect(unused).toEqual([]);
        const missing = Array.from(literals).filter(key => !prefixes.includes(key) && !(key in slText));
        expect(missing).toEqual([]);
        for (const id of SOLID_IDS) expect(slText[`solids_graph_solid_${id}`], id).toBeDefined();
        for (const mode of MODES) expect(slText[`solids_graph_mode_${mode}`], mode).toBeDefined();
    });
});

describe('review repairs', () => {
    const notes = () => document.body.textContent ?? '';

    it('states no direction for the mesh volume of a curved profile and the direction only for the cone', () => {
        const {graph} = mount();
        act(() => graph.setState({mode: 'volume', solid: 'parabola'}));
        const readouts = drawSolids(graph.state).readouts;
        if (readouts.mode !== 'volume') throw new Error('mode');
        expect(readouts.meshVolume, 'the parabola mesh lies above the exact volume').toBeGreaterThan(readouts.exact);
        expect(notes()).toContain(t('solids_graph_mesh_note'));
        expect(notes()).not.toContain(t('solids_graph_mesh_note_below'));
        act(() => graph.setState({mode: 'volume', solid: 'cone'}));
        const cone = drawSolids(graph.state).readouts;
        if (cone.mode !== 'volume') throw new Error('mode');
        expect(cone.meshVolume).toBeLessThan(cone.exact);
        expect(notes()).toContain(t('solids_graph_mesh_note_below'));
        act(() => graph.setState({mode: 'revolve', solid: 'parabola', axis: 'y'}));
        expect(notes()).toContain(t('solids_graph_mesh_note'));
        expect(notes()).not.toContain(t('solids_graph_mesh_note_below'));
    });

    it('says why the shear is missing for the cone and why the sphere has one axis', () => {
        const {graph} = mount();
        act(() => graph.setState({mode: 'stack', solid: 'cone'}));
        expect(notes()).toContain(t('solids_graph_shear_unavailable'));
        act(() => graph.setState({solid: 'cube'}));
        expect(notes()).not.toContain(t('solids_graph_shear_unavailable'));
        act(() => graph.setState({mode: 'revolve', solid: 'sphere'}));
        expect(notes()).toContain(t('solids_graph_axis_sphere_only_x'));
        act(() => graph.setState({solid: 'parabola'}));
        expect(notes()).not.toContain(t('solids_graph_axis_sphere_only_x'));
    });

    it('gives the cursor slider a value text with a percent sign and a decimal comma', () => {
        const {graph} = mount();
        setMode(graph, 'stack');
        expect(slider(t('solids_graph_cursor')).getAttribute('aria-valuetext')).toBe('50 %');
        act(() => graph.setCursor(3));
        expect(slider(t('solids_graph_cursor')).getAttribute('aria-valuetext')).toBe('7,5 %');
    });

    it('announces the axis in revolve mode, once, without the repeated word', async () => {
        const {graph} = mount();
        act(() => graph.setState({mode: 'revolve', solid: 'parabola', axis: 'y'}));
        const live = () => document.querySelector('[data-solids-live]')!.textContent!;
        await waitFor(() => expect(live()).toContain(`${t('solids_graph_axis_y')}`));
        expect(live()).toContain('Os vrtenja');
        expect(live()).not.toMatch(/Vrtenina: Vrtenina/);
        act(() => graph.setState({axis: 'x'}));
        await waitFor(() => expect(live()).toContain(t('solids_graph_axis_x')));
    });

    it('writes the section summary with a count-neutral Slovenian phrase', () => {
        expect(sl.solids_graph_summary_polygon).toBe('Stranice preseka: {value0}; ploščina: {value1}.');
        expect(Object.keys(en).includes('solids_graph_summary_polygon')).toBe(true);
    });

    it('drops the captions of the section edge and the cut points when the plane misses the solid', () => {
        const {graph} = mount();
        expect(document.querySelector('[data-caption="solids_graph_caption_section"]')).not.toBeNull();
        act(() => graph.setState({normal: [0, 0, 1], offset: 40}));
        const readouts = drawSolids(graph.state).readouts;
        if (readouts.mode !== 'section') throw new Error('mode');
        expect(readouts.kind).toBe('empty');
        expect(document.querySelector('[data-caption="solids_graph_caption_section"]')).toBeNull();
        expect(document.querySelector('[data-caption="solids_graph_caption_cut"]')).toBeNull();
        expect(document.querySelector('[data-caption="solids_graph_caption_kept"]')).not.toBeNull();
    });
});
