import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {afterEach, expect, test, vi} from 'vitest';
import {beginAppFigureExport, claimSessionBatch, FigureExportScope, reportFigureExportFailure, useFigureExportState} from './FigureExportOperation';
import {currentLanguage, setLanguage} from '../../../localization';
import {LanguageSelector} from '../../../localization/LanguageSelector';
import {sl} from '../../../localization/sl';
import {SaveImage} from '../SaveImage';

afterEach(() => { act(() => setLanguage('sl')); });

function makeScope() {
    const host = {requestRender: vi.fn((callback?: () => void) => callback?.()), reload: vi.fn()};
    return {scope: new FigureExportScope(host), host};
}
function deferred() {
    let resolve!: () => void, reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
    return {promise, resolve, reject};
}

test('a batch excludes single exports and a running single export excludes a batch', async () => {
    const {scope} = makeScope();
    const batch = scope.admitBatch();
    expect(batch).toBeDefined();
    expect(scope.admitBatch()).toBeUndefined();
    const refused = vi.fn(() => Promise.resolve());
    await scope.runSingle(refused);
    expect(refused).not.toHaveBeenCalled();
    batch?.();
    const single = deferred();
    const running = scope.runSingle(() => single.promise);
    expect(scope.busy).toBe(true);
    expect(scope.admitBatch()).toBeUndefined();
    await scope.runSingle(refused);
    expect(refused).not.toHaveBeenCalled();
    single.resolve();
    await running;
    expect(scope.busy).toBe(false);
    expect(scope.admitBatch()).toBeDefined();
});

test('a failed or throwing preparation releases admission', async () => {
    const {scope} = makeScope();
    await expect(scope.runSingle(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(scope.busy).toBe(false);
    await expect(scope.runSingle(() => { throw new Error('prep'); })).rejects.toThrow('prep');
    expect(scope.busy).toBe(false);
});

test('a reload requested during an export runs once, after the export is released', async () => {
    const {scope, host} = makeScope();
    expect(scope.requestReload()).toBe(true);
    const single = deferred();
    const running = scope.runSingle(() => single.promise);
    expect(scope.requestReload()).toBe(false);
    expect(scope.requestReload()).toBe(false);
    expect(host.reload).not.toHaveBeenCalled();
    single.resolve();
    await running;
    expect(host.reload).toHaveBeenCalledTimes(1);
    const batch = scope.admitBatch()!;
    scope.requestReload();
    batch();
    batch();
    expect(host.reload).toHaveBeenCalledTimes(2);
});

test('teardown mid-export frees the scope, drops the deferred reload and ignores late releases', async () => {
    const {scope, host} = makeScope();
    const single = deferred();
    const running = scope.runSingle(() => single.promise);
    scope.requestReload();
    scope.teardown();
    expect(scope.busy).toBe(false);
    const batch = scope.admitBatch()!;
    expect(batch).toBeDefined();
    scope.requestReload();
    host.requestRender.mockClear();
    single.resolve();
    await running;
    expect(host.requestRender).not.toHaveBeenCalled();
    expect(scope.busy).toBe(true); // the late single release must not free the new batch
    batch();
    expect(scope.busy).toBe(false);
    expect(host.reload).toHaveBeenCalledTimes(1); // only the reload requested after teardown
});

test('a session holds at most one batch claim until released', () => {
    const signal = new AbortController().signal;
    const release = claimSessionBatch(signal)!;
    expect(claimSessionBatch(signal)).toBeUndefined();
    release(); release();
    expect(claimSessionBatch(signal)).toBeDefined();
});

test('the language stays fixed while any export runs and is released exactly once', () => {
    render(<LanguageSelector/>);
    let outer!: () => void, inner!: () => void;
    act(() => { outer = beginAppFigureExport(); inner = beginAppFigureExport(); });
    expect(screen.getByRole('combobox')).toBeDisabled();
    act(() => setLanguage('en'));
    expect(currentLanguage()).toBe('sl');
    act(() => { inner(); inner(); });
    expect(screen.getByRole('combobox')).toBeDisabled();
    act(() => outer());
    expect(screen.getByRole('combobox')).toBeEnabled();
    act(() => setLanguage('en'));
    expect(currentLanguage()).toBe('en');
});

test('a failure is visible where the export is shown and clears when the next export begins', () => {
    function Probe() { const {failed, exporting} = useFigureExportState(); return <p>{`${exporting}-${failed}`}</p>; }
    render(<Probe/>);
    const end = (() => { let e!: () => void; act(() => { e = beginAppFigureExport(); }); return e; })();
    act(() => reportFigureExportFailure('single'));
    act(() => end());
    expect(screen.getByText('false-single')).toBeInTheDocument();
    let next!: () => void;
    act(() => { next = beginAppFigureExport(); });
    expect(screen.getByText('true-undefined')).toBeInTheDocument();
    act(() => next());
});

test('a failed export shows its alert beside the SVG/PNG buttons and disables them while running', () => {
    render(<SaveImage saveAsSVG={() => undefined} saveAsPNG={() => undefined}/>);
    expect(screen.queryByRole('alert')).toBeNull();
    let end!: () => void;
    act(() => { end = beginAppFigureExport(); });
    expect(screen.getByRole('button', {name: 'SVG'})).toBeDisabled();
    act(() => reportFigureExportFailure('single'));
    act(() => end());
    expect(screen.getByRole('alert')).toHaveTextContent(sl.figure_export_failed_try_again);
    expect(screen.getByRole('button', {name: 'SVG'})).toBeEnabled();
});

test('a failed figure batch does not raise the alert beside the SVG/PNG buttons', () => {
    render(<SaveImage saveAsSVG={() => undefined} saveAsPNG={() => undefined}/>);
    let end!: () => void;
    act(() => { end = beginAppFigureExport(); });
    act(() => reportFigureExportFailure('batch'));
    act(() => end());
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => { end = beginAppFigureExport(); });
    act(() => end());
});
