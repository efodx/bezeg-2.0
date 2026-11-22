import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FunctionTransformationGraph} from './FunctionTransformationGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {UntaggedWriteError} from '../base/writes/parameterArbiter';
import {runAs} from '../base/writes/writeSource';

beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

class ObservedTransformationGraph extends FunctionTransformationGraph {
    modelNow() {
        return this.model;
    }

    /** A setter call with no write source: what a writer that forgot to say who it is would do. */
    setCDirectly(value: number) {
        this.setParameter('c', value);
    }
}

test('parameter writes are source-tagged: a seeded untagged write throws, the tools field and a lesson write apply, a held key refuses the lesson', () => {
    const graph = new ObservedTransformationGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const parameters = graph.parameters!;
    expect(parameters.keys()).toEqual(['transform-a', 'transform-b', 'transform-c', 'transform-d', 'transform-u', 'transform-base', 'view']);

    expect(() => act(() => graph.setCDirectly(0.5))).toThrow(UntaggedWriteError);
    act(() => runAs('learner', () => graph.setCDirectly(1)));
    expect(graph.modelNow().c).toBe(1);

    act(() => { enterNumber(screen.getByLabelText('Vodoravni premik c, vrednost'), '1,5'); });
    expect(graph.modelNow().c).toBe(1.5);

    act(() => { expect(parameters.write('transform-d', 2, 'lesson')).toEqual({status: 'applied'}); });
    expect(parameters.read('transform-d')).toBe(2);
    expect(parameters.write('transform-b', 0, 'lesson').status).toBe('refused-domain');

    const release = parameters.hold('transform-a');
    expect(parameters.write('transform-a', 2, 'lesson')).toEqual({status: 'refused-arbiter', reason: 'held'});
    release();
    act(() => { expect(parameters.write('transform-a', 2, 'lesson').status).toBe('applied'); });
});
