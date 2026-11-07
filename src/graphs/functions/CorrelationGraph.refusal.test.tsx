import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CorrelationGraph} from './CorrelationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {CORRELATION_POINTS_MAX} from '../../analysis/correlationModel';
import {DomainError} from './BaseFunctionGraph';
import {GuidedLesson} from '../../learning/runtime/GuidedLesson';
import type {LessonAction, LessonDefinition} from '../../learning/model';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    setLanguage('sl');
    localStorage.clear();
    (window as Window & {MathJax?: unknown}).MathJax = {startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise: vi.fn().mockResolvedValue(undefined)};
});

class LessonDrivenCorrelationGraph extends CorrelationGraph {
    guardedAdd() { let accepted = true; act(() => { accepted = this.guarded(() => this.addPoint()); }); return accepted; }
    lesson(action: LessonAction) { this.applyLessonAction(action); }
}

const addAtCap: LessonAction = {kind: 'correlation', operation: 'add-point'} as LessonAction;
const lesson: LessonDefinition = {
    id: 'refusal-test', demonstrationId: 'prob-correlation', title: {sl: 'Test', en: 'Test'}, summary: {sl: 'Test', en: 'Test'},
    steps: [{id: 'one', title: {sl: 'Ena', en: 'One'}, body: {sl: 'Telo', en: 'Body'}, scene: {actions: [addAtCap]}}],
};

test('an add at the cap reads the same in the lesson as in the inspector, and the inspector has exactly one refusal notice', () => {
    const graph = new LessonDrivenCorrelationGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    while (graph.state.model.points.length < CORRELATION_POINTS_MAX) act(() => { fireEvent.click(screen.getByRole('button', {name: 'Povečaj število'})); });
    expect(document.querySelectorAll('[data-refusal-notice]')).toHaveLength(1);

    expect(graph.guardedAdd()).toBe(false);
    const inspectorText = document.querySelector('[data-refusal-notice]')?.textContent;
    expect(inspectorText).toBe('Število točk mora biti od 2 do 20.');

    let thrown: unknown;
    try { graph.lesson(addAtCap); } catch (error) { thrown = error; }
    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).message).toBe(inspectorText);

    render(<GuidedLesson lesson={lesson} onClose={vi.fn()} capabilities={{
        captureState: () => ({version: 1, value: 'before'}), restoreState: vi.fn(), apply: action => graph.lesson(action),
    }}/>);
    expect(screen.getByRole('alert')).toHaveTextContent(inspectorText!);
    expect(document.querySelectorAll('[data-refusal-notice]')).toHaveLength(1);
});
