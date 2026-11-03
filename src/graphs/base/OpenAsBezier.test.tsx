import React, {useEffect} from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {beforeAll, describe, expect, test, vi} from 'vitest';
import BezierCurveGraph from '../curves/bezier/BezierCurveGraph';
import BSplineExtractionGraph from '../curves/bspline/BSplineExtractionGraph';
import {GraphRoute} from './GraphRoute';
import {BEZIER_ROUTE_PATH, readBezierHandoff, withBezierHandoff} from '../../bezierHandoff';
import {createDemonstrationReturnContext, readDemonstrationReturnContext} from '../../demonstrationNavigation';

vi.mock('../../mathjax/loadMathJax', () => ({loadMathJax: () => Promise.resolve()}));

beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

const pieceTwo: Array<[number, number]> = [[2, 2], [3, 2], [4, 0]];
let bezier: BezierCurveGraph | undefined;
const seen: {state: unknown} = {state: undefined};
let extraction: BSplineExtractionGraph | undefined;
const Probe = () => { const l = useLocation(); useEffect(() => { seen.state = l.state; }); return <p data-testid="path">{l.pathname}</p>; };

function mountBezier(state: unknown) {
    bezier = undefined;
    const create = () => (bezier = new BezierCurveGraph());
    return render(<MemoryRouter initialEntries={[{pathname: BEZIER_ROUTE_PATH, state}]}>
        <Probe/><Routes><Route path={BEZIER_ROUTE_PATH} element={<GraphRoute create={create}/>}/></Routes></MemoryRouter>);
}
const curvePoints = () => (bezier!.exportPreset().data as Array<[string, {points: number[][]}]>)[0][1].points;
const defaultPoints = [[-4, -3], [-3, 2], [2, 2], [3, -2]];

describe('Bezier handoff on mount', () => {
    test('a valid handoff loads exactly the piece points and is consumed from history state', async () => {
        const context = createDemonstrationReturnContext({pathname: '/bezeg-2.0/demonstrations', search: ''}, 'card', 5, 'focus');
        mountBezier(withBezierHandoff({demonstrationReturn: context}, pieceTwo));
        await waitFor(() => expect(bezier?.state.initialized).toBe(true));
        expect(curvePoints()).toEqual(pieceTwo);
        await waitFor(() => expect(readBezierHandoff(seen.state)).toBeUndefined());
        expect(seen.state).not.toHaveProperty('bezierHandoff');
        expect(readDemonstrationReturnContext(seen.state)).toEqual(context);
    });

    test.each([
        ['NaN', {kind: 'bezier-points', points: [[0, 0], [NaN, 1]]}],
        ['wrong shape', {kind: 'bezier-points', points: [[0, 0, 1], [1, 1, 1]]}],
        ['too many points', {kind: 'bezier-points', points: Array.from({length: 17}, (_, i) => [i, i])}],
        ['a single point', {kind: 'bezier-points', points: [[0, 0]]}],
        ['non-array', {kind: 'bezier-points', points: 'abc'}],
        ['wrong kind', {kind: 'other', points: pieceTwo}],
        ['not an object', 7],
    ])('an invalid handoff (%s) keeps the default scene', async (_name, handoff) => {
        mountBezier({bezierHandoff: handoff});
        await waitFor(() => expect(bezier?.state.initialized).toBe(true));
        expect(curvePoints()).toEqual(defaultPoints);
        await waitFor(() => expect(seen.state).not.toHaveProperty('bezierHandoff'));
    });

    test('the graph keeps the handoff after the history field is gone, and Reset returns to the default scene', async () => {
        mountBezier(withBezierHandoff(undefined, pieceTwo));
        await waitFor(() => expect(bezier?.state.initialized).toBe(true));
        await waitFor(() => expect(seen.state).not.toHaveProperty('bezierHandoff'));
        expect(curvePoints()).toEqual(pieceTwo);
        act(() => { void bezier!.reset(); });
        await waitFor(() => expect(curvePoints()).toEqual(defaultPoints));
    });

    test('a remount from the cleaned history state does not re-apply the handoff', async () => {
        const first = mountBezier(withBezierHandoff(undefined, pieceTwo));
        await waitFor(() => expect(bezier?.state.initialized).toBe(true));
        await waitFor(() => expect(seen.state).not.toHaveProperty('bezierHandoff'));
        const cleaned = seen.state;
        first.unmount();
        mountBezier(cleaned);
        await waitFor(() => expect(bezier?.state.initialized).toBe(true));
        expect(curvePoints()).toEqual(defaultPoints);
    });
});

describe('Open as Bezier from the extraction graph', () => {
    test('the button navigates to the Bezier route with the selected piece and keeps the return context', async () => {
        const context = createDemonstrationReturnContext({pathname: '/bezeg-2.0/demonstrations', search: ''}, 'card', 5, 'focus');
        bezier = undefined;
        extraction = undefined;
        const ExtRoute = () => <GraphRoute create={() => (extraction = new BSplineExtractionGraph())}/>;
        const BezRoute = () => <GraphRoute create={() => (bezier = new BezierCurveGraph())}/>;
        render(<MemoryRouter initialEntries={[{pathname: '/ext', state: {demonstrationReturn: context}}]}>
            <Probe/>
            <Routes>
                <Route path="/ext" element={<ExtRoute/>}/>
                <Route path={BEZIER_ROUTE_PATH} element={<BezRoute/>}/>
            </Routes></MemoryRouter>);
        await waitFor(() => expect(extraction?.state.initialized).toBe(true));
        const buttons = await screen.findAllByRole('button', {name: /^Odpri kot Bézierjevo krivuljo: odsek \d+$/});
        expect(buttons[1]).toHaveTextContent('Odpri kot Bézierjevo krivuljo');
        expect(extraction!.pieceControlPoints(1)).toEqual(pieceTwo);
        fireEvent.click(buttons[1]);
        await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(BEZIER_ROUTE_PATH));
        await waitFor(() => expect(bezier?.state.initialized).toBe(true));
        expect(curvePoints()).toEqual(pieceTwo);
        await waitFor(() => expect(seen.state).not.toHaveProperty('bezierHandoff'));
        expect(readDemonstrationReturnContext(seen.state)).toEqual(context);
    });
});
