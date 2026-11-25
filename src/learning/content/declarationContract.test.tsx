/**
 * The declaration contract (task 02 slice 3). Every graph that declares (found by its `declaration()` override) is
 * mounted, and each lesson step's scene is applied synchronously in one sequence on it; then every frame of that lesson is
 * checked against the declaration of that scene's state: ids exist, highlighted rows and opened cards exist in this
 * state, at most three highlights, every legend entry resolves to a drawn object, a used control exists and is not
 * locked, and every text is a catalog Message or a FormattedValue. Unsampled: it covers every frame of every declaring
 * graph. The negative tests keep the checks themselves honest with synthetic declarations and frames.
 */
import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import BaseGraph, {type BaseGraphState} from '../../graphs/base/BaseGraph';
import {createGraph} from '../../graphs/base/createTestGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {checkDeclaration, checkFrame, type FrameDeclaration, type GraphDeclaration} from '../../graphs/base/declare/graphDeclaration';
import {message, renderMessage, setLanguage} from '../../localization';
import {GUIDED_LESSON_AVAILABLE_IDS, getLessonForDemonstration} from '../runtime/lessonCatalog';
import {framesForLessonStep, type LessonDefinition} from '../model';
import {chapterOwnerRows, getChapterOwnedLessons} from './chapterOwnedLessons';
import type {DemonstrationId} from '../../demonstrations';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Fields of a declaration that hold text. */
const TEXT_FIELDS = new Set(['label', 'help', 'text', 'title', 'unit', 'name', 'value', 'readoutHelp']);

function isCatalogText(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    if (record.kind === 'number') return typeof record.value === 'number';
    if (record.kind === 'formatted') return typeof record.text === 'string';
    if (typeof record.key !== 'string' || typeof record.params !== 'object' || record.params === null) return false;
    try {
        const rendered = renderMessage(value as never);
        return rendered.length > 0 && !/\{\w+\}/.test(rendered);
    } catch {
        return false;
    }
}

/** Every text-bearing field below `node` that is not a catalog Message, number or FormattedValue. */
function foreignText(node: unknown, path: string, found: string[] = []): string[] {
    if (Array.isArray(node)) node.forEach((item, index) => foreignText(item, `${path}[${index}]`, found));
    else if (typeof node === 'object' && node !== null) {
        for (const [field, value] of Object.entries(node)) {
            if (value === undefined) continue;
            // A choice option's `value` is an id; a readout row's `value` is text.
            if (TEXT_FIELDS.has(field) && !(field === 'value' && 'label' in node)) {
                if (!isCatalogText(value)) found.push(`${path}.${field}`);
            } else if (typeof value === 'object') foreignText(value, `${path}.${field}`, found);
        }
    }
    return found;
}

/** All problems of one frame in the scene whose declaration is `declaration`, on `graph`. */
function contractProblems(graph: BaseGraph<BaseGraphState>, declaration: GraphDeclaration, frame: FrameDeclaration | undefined, where: string): string[] {
    const problems = [
        ...checkDeclaration(declaration, graph.getPreviewGeometry() !== undefined),
        ...(frame ? checkFrame(frame, declaration) : []),
    ].map(problem => `${problem.where}: ${problem.problem}`);
    for (const entry of declaration.legend ?? []) {
        if (!graph.drawnObject(entry.object)) problems.push(`legend ${entry.id}: object "${entry.object}" is not drawn`);
    }
    for (const path of foreignText(declaration, 'declaration')) problems.push(`${path}: not a catalog Message or FormattedValue`);
    return problems.map(problem => `${where}: ${problem}`);
}

/** A graph declares when its `declaration()` returns one (a function graph without a `functionPanel()` returns undefined). */
const overridesDeclaration = (graph: BaseGraph<BaseGraphState>) => graph.getDeclaration() !== undefined;

/** Every lesson on a demonstration: the catalog one plus all chapter-owned ones (linear-map has L1 to L7). */
function lessonsFor(id: DemonstrationId): LessonDefinition[] {
    const lessons = new Set<LessonDefinition>();
    const first = getLessonForDemonstration(id);
    if (first) lessons.add(first);
    for (const row of chapterOwnerRows()) {
        if (row.demonstrationId !== id) continue;
        const lesson = getChapterOwnedLessons(row.chapterId)?.lesson(row.sectionId);
        if (lesson) lessons.add(lesson);
    }
    return [...lessons];
}

/** The demonstrations with a guided or chapter-owned lesson whose graph declares, found by the hook. */
const lessonIds = new Set<DemonstrationId>([...GUIDED_LESSON_AVAILABLE_IDS, ...chapterOwnerRows().map(row => row.demonstrationId)]);
const declaringIds = [...lessonIds].filter(id => overridesDeclaration(createGraph(id))) as DemonstrationId[];

describe('declaration contract on lesson frames', () => {
    test('at least one graph declares', () => {
        expect(declaringIds.length).toBeGreaterThan(0);
    });

    test('the contract is not vacuous: a Taylor frame declares using show-error', () => {
        const frames = getLessonForDemonstration('taylor' as DemonstrationId)!.steps.flatMap(step => framesForLessonStep(step));
        expect(frames.some(frame => frame.declare?.uses?.includes('show-error' as never))).toBe(true);
    });

    test.each(declaringIds)('%s: every frame is consistent with its scene', id => {
        const mounted = mountGraph(createGraph(id));
        try {
            const graph = mounted.graph;
            const capabilities = graph.getLessonCapabilities();
            const checkpoint = capabilities.captureState();
            const problems: string[] = [];
            let frames = 0;
            for (const lesson of lessonsFor(id)) for (const step of lesson.steps) {
                // Steps without a scene keep the last prepared scene, as the lesson session does.
                if (step === lesson.steps[0] && !step.scene) act(() => capabilities.restoreState(checkpoint));
                if (step.scene) {
                    act(() => {
                        capabilities.restoreState(checkpoint);
                        for (const action of step.scene!.actions) capabilities.apply(action);
                    });
                }
                const declaration = graph.getDeclaration();
                if (!declaration) {
                    problems.push(`${step.id}: declaring graph returned no declaration`);
                    continue;
                }
                for (const frame of framesForLessonStep(step)) {
                    frames++;
                    problems.push(...contractProblems(graph, declaration, frame.declare, `${step.id}/${frame.id}`));
                }
            }
            expect(frames).toBeGreaterThan(0);
            expect(problems).toEqual([]);
        } finally {
            mounted.view.unmount();
        }
    });
});

describe('the contract checks fail on seeded mistakes (synthetic declarations and frames)', () => {
    const synthetic: GraphDeclaration = {
        readouts: [{id: 'g', rows: [{id: 'row', value: {kind: 'formatted', text: '1,5'}}]}],
        legend: [{id: 'curve', label: message('taylor_legend_function'), kind: 'line', object: 'function'}],
    } as unknown as GraphDeclaration;

    function mountedTaylorLike() {
        const mounted = mountGraph(createGraph('taylor' as DemonstrationId));
        return mounted;
    }

    test('a wrong id fails', () => {
        const mounted = mountedTaylorLike();
        try {
            const problems = contractProblems(mounted.graph, mounted.graph.getDeclaration()!, {highlight: ['no-such-row'] as never, uses: ['no-such-control'] as never}, 'seed');
            expect(problems.join('\n')).toContain('highlight no-such-row: no such row or note in this scene');
            expect(problems.join('\n')).toContain('uses no-such-control: no such control or action in this scene');
        } finally {
            mounted.view.unmount();
        }
    });

    test('a highlighted row absent from the scene fails', () => {
        const mounted = mountedTaylorLike();
        try {
            const declaration = mounted.graph.getDeclaration()!;
            const rows = (declaration.readouts ?? []).flatMap(group => group.rows).map(row => row.id);
            const hidden = {...declaration, readouts: (declaration.readouts ?? []).map(group => ({...group, rows: group.rows.filter(row => row.id !== rows[0])}))};
            const problems = contractProblems(mounted.graph, hidden, {highlight: [rows[0]]}, 'seed');
            expect(problems).toEqual([`seed: highlight ${rows[0]}: no such row or note in this scene`]);
        } finally {
            mounted.view.unmount();
        }
    });

    test('a legend entry whose object is not drawn fails', () => {
        const mounted = mountedTaylorLike();
        try {
            const entry = {id: 'curve', label: message('taylor_legend_function'), kind: 'line', object: 'not-drawn'};
            const problems = contractProblems(mounted.graph, {...synthetic, legend: [entry]} as unknown as GraphDeclaration, undefined, 'seed');
            expect(problems).toContain('seed: legend curve: object "not-drawn" is not drawn');
        } finally {
            mounted.view.unmount();
        }
    });

    test('more than three highlights, a locked control and foreign text fail', () => {
        const mounted = mountedTaylorLike();
        try {
            const declaration = {
                readouts: [{id: 'g', rows: ['a', 'b', 'c', 'd'].map(id => ({id, value: {kind: 'formatted', text: '1'}}))}],
                parameters: [{key: 'p', kind: 'toggle', label: 'Plain string', placement: 'board', locked: true}],
            } as unknown as GraphDeclaration;
            const problems = contractProblems(mounted.graph, declaration, {highlight: ['a', 'b', 'c', 'd'] as never, uses: ['p'] as never}, 'seed').join('\n');
            expect(problems).toContain('4 highlights, at most 3');
            expect(problems).toContain('uses p: locked in this scene');
            expect(problems).toContain('declaration.parameters[0].label: not a catalog Message or FormattedValue');
        } finally {
            mounted.view.unmount();
        }
    });
});
