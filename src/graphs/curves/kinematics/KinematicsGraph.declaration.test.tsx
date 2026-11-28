import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import KinematicsGraph, {frameFor, type KinematicsIds} from './KinematicsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage, type Message} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import {DEFAULT_KINEMATICS_STATE, MOTION_IDS, deriveKinematics, withMotion, type MotionChoice, type ToggleField} from '../../../kinematics/kinematicsModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: KinematicsGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new KinematicsGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<KinematicsIds>};
}

const motion = (id: MotionChoice): Step => g => learner(() => g.editMotion(id));
const toggle = (field: ToggleField, on = true): Step => g => learner(() => g.editToggle(field, on));
const at = (time: number): Step => g => learner(() => { g.setTime(time); });

const rows = (current: GraphDeclaration<KinematicsIds>) => current.readouts![0].rows;
const rowIds = (current: GraphDeclaration<KinematicsIds>) => rows(current).map(row => row.id as string);
const rowValue = (current: GraphDeclaration<KinematicsIds>, id: string) => (rows(current).find(row => row.id === id)?.value as {value: number} | undefined)?.value;
const legendIds = (current: GraphDeclaration<KinematicsIds>) => (current.legend ?? []).map(entry => entry.id as string);
const noteIds = (current: GraphDeclaration<KinematicsIds>) => (current.notes ?? []).map(note => note.id as string);
const paramKeys = (current: GraphDeclaration<KinematicsIds>) => (current.parameters ?? []).map(parameter => parameter.key as string);
const puckActions = (current: GraphDeclaration<KinematicsIds>) => (current.actions ?? []).filter(action => action.puck).map(action => action.id as string);

describe('curve-kinematics declaration', () => {
    test('the default cycloid: the time puck and the two switch pucks, the rows with the two scales, a legend of what is drawn at the cusp, consistent', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(paramKeys(current)).toEqual(['kinematics-time']);
        expect(puckActions(current)).toEqual(['split', 'osculating']);
        expect((current.actions ?? []).map(action => action.id)).toEqual(['play-pause', 'reset-time', 'split', 'osculating']);
        expect(rowIds(current)).toEqual(['time', 'position', 'velocity', 'speed', 'acceleration', 'a-t', 'a-n', 'kappa', 'kappa-v2', 'scale-velocity', 'scale-acceleration']);
        expect(noteIds(current)).toEqual(['status', 'sign']);
        expect(legendIds(current)).toEqual(['path', 'trace', 'point', 'acceleration']);
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        view.unmount();
    });

    test('the switches add what is drawn: arrows, the trace, the axes and the osculating circle, each in the legend and linked from its row', () => {
        const {graph, declaration, view} = setup(at(0.5), toggle('showVelocity'), toggle('showAcceleration'), toggle('split'), toggle('osculating'), toggle('trace'));
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(legendIds(current)).toEqual(['path', 'trace', 'point', 'velocity', 'acceleration', 'tangential', 'normal', 'osculating', 'axes']);
        expect(rowIds(current)).toEqual(expect.arrayContaining(['scale-velocity', 'scale-acceleration']));
        const linked = Object.fromEntries(rows(current).filter(row => row.legend).map(row => [row.id, row.legend]));
        expect(linked).toEqual({position: 'point', velocity: 'velocity', acceleration: 'acceleration', 'a-t': 'tangential', 'a-n': 'normal'});
        for (const entry of current.legend ?? []) {
            expect(graph.drawnObject(entry.object)?.visible, entry.id).toBe(true);
        }
        act(() => toggle('showVelocity', false)(graph));
        expect(legendIds(declaration())).not.toContain('velocity');
        expect(graph.drawnObject('velocity')!.visible).toBe(false);
        view.unmount();
    });

    test('the time puck ends at the motion, and the rows follow the time', () => {
        const {graph, declaration, view} = setup(at(1));
        const time = declaration().parameters![0];
        expect(time).toMatchObject({key: 'kinematics-time', kind: 'range', min: 0, step: 0.01, symbol: 't'});
        expect((time as {max: number}).max).toBeCloseTo(graph.derived().tEnd, 9);
        expect(rowValue(declaration(), 'time')).toBeCloseTo(1, 9);
        expect(noteIds(declaration())).not.toContain('ended');
        act(() => at(graph.derived().tEnd)(graph));
        expect(noteIds(declaration())).toContain('ended');
        view.unmount();
    });

    test('the circular motion declares the radius, the angular velocity and the speed variation with the time, and keeps the switches in Orodja', () => {
        const {graph, declaration, view} = setup(motion('circular'));
        let current = declaration();
        expect(paramKeys(current)).toEqual(['kinematics-time', 'kinematics-radius', 'kinematics-omega', 'kinematics-b']);
        expect(puckActions(current)).toEqual([]);
        expect(rowIds(current)).toContain('period');
        expect(legendIds(current)).not.toContain('reference');
        act(() => { graph.parameters!.write('kinematics-b', 0.5, 'learner'); });
        current = declaration();
        expect(legendIds(current)).toContain('reference');
        expect(graph.drawnObject('reference')!.visible).toBe(true);
        expect(checkDeclaration(current)).toEqual([]);
        view.unmount();
    });

    test('the projectile declares the launch speed and angle and the flight rows', () => {
        const {declaration, view} = setup(motion('projectile'));
        const current = declaration();
        expect(paramKeys(current)).toEqual(['kinematics-time', 'kinematics-v0', 'kinematics-alpha']);
        expect(rowIds(current)).toEqual(expect.arrayContaining(['flight', 'range', 'height', 'gravity']));
        expect(checkDeclaration(current)).toEqual([]);
        view.unmount();
    });

    test('a number puck writes through the arbiter on its grid; off the range or off the motion it is a catalog refusal and nothing changes', () => {
        const {graph, view} = setup(motion('circular'));
        act(() => { graph.parameters!.write('kinematics-radius', 2, 'learner'); });
        expect(graph.state.radius).toBe(2);
        const bad = graph.parameters!.write('kinematics-radius', 99, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(bad.status === 'refused-domain' ? bad.error.message : '').toMatch(/Vrednost mora biti od/);
        expect(graph.state.radius).toBe(2);
        act(() => learner(() => graph.editMotion('cycloid')));
        const refused = graph.parameters!.write('kinematics-b', 0.5, 'learner');
        expect(refused.status).toBe('refused-domain');
        expect(graph.state.b).toBe(0);
        view.unmount();
    });

    test('the time writes through the arbiter and pauses the playback; a time past the end is a catalog refusal', () => {
        const {graph, view} = setup();
        act(() => graph.play());
        expect(graph.playing).toBe(true);
        act(() => { graph.parameters!.write('kinematics-time', 1, 'learner'); });
        expect(graph.time).toBe(1);
        expect(graph.playing).toBe(false);
        const bad = graph.parameters!.write('kinematics-time', 99, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(bad.status === 'refused-domain' ? bad.error.message : '').toMatch(/Čas mora biti od 0 do/);
        expect(graph.time).toBe(1);
        view.unmount();
    });

    test('the switch pucks and the playback actions run as the learner', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('split'));
        expect(graph.state.split).toBe(true);
        expect(declaration().actions!.find(action => action.id === 'split')!.pressed).toBe(true);
        act(() => graph.performAction('osculating'));
        expect(graph.state.osculating).toBe(true);
        act(() => graph.performAction('split'));
        expect(graph.state.split).toBe(false);
        act(() => at(1)(graph));
        act(() => graph.performAction('reset-time'));
        expect(graph.time).toBe(0);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });

    test('the frame is the path box with one arrow of margin, with no room for captions, and it is the followed view', () => {
        const {graph, declaration, view} = setup();
        const box = frameFor(graph.derived());
        expect(declaration().followView).toEqual(box);
        expect(declaration().marks!.must).toEqual([{kind: 'box', left: box[0], top: box[1], right: box[2], bottom: box[3]}]);
        const [minX, maxX, minY, maxY] = graph.derived().box;
        expect(minX - box[0]).toBeCloseTo(box[2] - maxX, 9);
        expect(minY - box[3]).toBeCloseTo(box[1] - maxY, 9);
        view.unmount();
    });

    test.each([...MOTION_IDS])('%s: an arrow of its full length stays in the frame and the figure fills the limiting side', motion => {
        const derived = deriveKinematics(withMotion(DEFAULT_KINEMATICS_STATE, motion));
        const [left, top, right, bottom] = frameFor(derived);
        const [minX, maxX, minY, maxY] = derived.box;
        expect(minX - left).toBeGreaterThanOrEqual(derived.scales.unit);
        expect(right - maxX).toBeGreaterThanOrEqual(derived.scales.unit);
        expect(minY - bottom).toBeGreaterThanOrEqual(derived.scales.unit);
        expect(top - maxY).toBeGreaterThanOrEqual(derived.scales.unit);
        const scale = Math.min(850 / (right - left), 530 / (top - bottom)); // pixels per unit on a 850 x 530 board
        const fill = Math.max(((maxX - minX) * scale) / 850, ((maxY - minY) * scale) / 530);
        expect(fill, motion).toBeGreaterThanOrEqual(0.45);
    });

    test('no board text repeats the legend or the rows: the only texts are the arrow names', () => {
        const {graph, view} = setup();
        const {board} = graph as unknown as {board: {objectsList: readonly {elType: string; plaintext?: string}[]}};
        const texts = board.objectsList.filter(object => object.elType === 'text').map(object => object.plaintext ?? '');
        // Four arrow tags (v, a, aₜ, aₙ), none of them a caption sentence.
        for (const text of texts) expect(text, 'a caption sentence').not.toMatch(/ /);
        view.unmount();
    });

    test('the sentences follow a language switch', () => {
        const {declaration, view} = setup(at(1));
        const sentence = () => renderMessage(declaration().notes![0].text as Message);
        expect(sentence()).toMatch(/Hitrost|Točka|hitrost/);
        const slovenian = sentence();
        act(() => setLanguage('en'));
        expect(sentence()).not.toBe(slovenian);
        view.unmount();
    });
});
