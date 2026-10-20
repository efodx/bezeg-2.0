import React, {useRef} from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createMemoryRouter, RouterProvider, useLocation, useNavigate} from 'react-router-dom';
import {useChapterActivity, resolveActivityContext} from './useChapterActivity';
import {ChapterActivityVisit} from './ChapterActivityVisit';
import {clearNavigationFailure, navigationFailureSnapshot} from './navigationFailure';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../model';

test('validates chapter and activity together, rejects duplicates and graph mismatches', () => {
    expect(resolveActivityContext('?chapter=bezier-curves&activity=shape-control', 'bezier').activity?.id).toBe('shape-control');
    for (const search of ['?chapter=bezier-curves', '?activity=shape-control', '?chapter=wrong&activity=shape-control',
        '?chapter=bezier-curves&activity=missing', '?chapter=bezier-curves&activity=shape-control&activity=geometric-bounds']) {
        expect(resolveActivityContext(search, 'bezier')).toEqual({activity: undefined, invalid: true});
    }
    expect(resolveActivityContext('?chapter=bezier-curves&activity=shape-control', 'bernstein').invalid).toBe(true);
    expect(resolveActivityContext('?other=kept', 'bezier')).toEqual({activity: undefined, invalid: false});
});

test('persists a reading invocation on the initial native history entry with the default router key', () => {
    const visit = new ChapterActivityVisit();
    for (const initial of [null, {idx: 0}]) {
        window.history.replaceState(initial, '', '/bezeg-2.0/learn/bezier-curves');
        visit.prepareActivityLaunch('curve-parameter', 'parameter', 'activity-curve-parameter', 'default');
        expect(window.history.state).toEqual({
            ...(initial ?? {}),
            key: 'default', idx: 0,
            usr: {chapterReadingInvocation: {
                v: 1, activityId: 'curve-parameter', sectionId: 'parameter', readingKey: 'default',
            }},
        });
    }
    window.history.replaceState(null, '', '/');
});

function fixture(initialEntries: string[], failPreparation = false, initialState?: unknown) {
    const visit = new ChapterActivityVisit();
    let value = 10;
    let playing = false;
    let shouldFailPreparation = failPreparation;
    let failRestore = false;
    let failClose = false;
    const disposeFailedGraph = vi.fn();
    const graph: LessonGraphCapabilities = {
        captureState: vi.fn((): LessonSceneCheckpoint => ({version: 1, value: {value, playing}})),
        restoreState: vi.fn((checkpoint: LessonSceneCheckpoint) => {
            if (failRestore) throw new Error('rollback unavailable');
            const saved = checkpoint.value as {value: number; playing: boolean};
            value = saved.value; playing = saved.playing;
        }),
        apply: vi.fn(action => {
            if (shouldFailPreparation) throw new Error('preparation failed');
            if (action.kind === 'prepared-scene') value = 0;
        }),
        stopAnimations: () => { playing = false; }, pauseAnimations: () => { playing = false; }, isAvailable: () => true,
    };
    function Workspace() {
        const closeLesson = useRef<(() => void)>();
        closeLesson.current = () => {
            if (failClose) { failClose = false; throw new Error('lesson close failed'); }
        };
        const [languageVersion, setLanguageVersion] = React.useState(0);
        const activity = useChapterActivity(graph, undefined, closeLesson, disposeFailedGraph, visit);
        const location = useLocation();
        const navigate = useNavigate();
        return <><output data-testid="url">{location.pathname + location.search + location.hash}</output>
            <output data-testid="activity">{activity.activity?.id ?? 'ordinary'}</output>
            <output data-testid="return-path">{activity.returnPath}</output>
            <output data-testid="fatal">{activity.fatal ? 'fatal' : 'recoverable'}</output>
            <output data-testid="started">{activity.activity && visit.readActivityEntry(location.state, activity.activity.id)?.started ? 'started' : 'unmarked'}</output>
            <output data-testid="language">{languageVersion}</output>
            <button onClick={() => { value = 24; playing = true; }}>edit</button>
            <button onClick={() => { value = 37; playing = true; }}>edit second</button>
            <button onClick={activity.returnToReading}>return</button>
            <button onClick={activity.reset}>reset</button>
            <button onClick={activity.freeExplore}>free</button>
            <button onClick={activity.readAbout}>read</button>
            <button onClick={activity.retry}>retry</button>
            <button onClick={() => navigate('/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds')}>other activity</button>
            <button onClick={() => navigate('/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control&unrelated=yes#kept')}>shape activity</button>
            <button onClick={() => navigate(location.pathname + location.search + '&unrelated=yes#kept')}>unrelated query</button>
            <button onClick={() => setLanguageVersion(version => version + 1)}>language rerender</button>
            <button onClick={() => { shouldFailPreparation = true; failRestore = true; }}>break rollback</button>
            <button onClick={() => { shouldFailPreparation = false; }}>allow preparation</button>
            <button onClick={() => { failClose = true; }}>fail next lesson close</button>
            <span>{activity.error ? 'error' : 'ready'}</span></>;
    }
    function Reading() {
        const navigate = useNavigate(); const location = useLocation();
        return <><output data-testid="url">{location.pathname + location.search + location.hash}</output><h1>reading</h1><button onClick={() => navigate('/bezeg-2.0/bezier/curve', {state: {chapterRestore: true}})}>graph</button><button onClick={() => {
            visit.prepareActivityLaunch('shape-control', 'control-points', 'activity-shape-control', location.key);
            navigate('/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control', {
                state: visit.activityEntryState(location.state, 'shape-control', location.key),
            });
        }}>open</button></>;
    }
    const entries = initialEntries.map((entry, index) => {
        if (initialState === undefined || index !== initialEntries.length - 1) return entry;
        const [pathAndQuery, hash] = entry.split('#');
        const [pathname, search] = pathAndQuery.split('?');
        return {pathname, search: search ? `?${search}` : '', hash: hash ? `#${hash}` : '', state: initialState};
    });
    const router = createMemoryRouter([
        {path: '/bezeg-2.0/learn/bezier-curves', element: <Reading/>},
        {path: '/bezeg-2.0/bezier/curve', element: <Workspace/>},
    ], {initialEntries: entries});
    render(<RouterProvider router={router}/>);
    return {router, graph, visit, disposeFailedGraph, state: () => ({value, playing})};
}

beforeEach(() => { clearNavigationFailure(); });

test('chapter return traverses actual history, Forward restores paused edits, reset is explicit', async () => {
    const f = fixture(['/bezeg-2.0/learn/bezier-curves#control-points']);
    fireEvent.click(screen.getByText('open'));
    expect(f.state().value).toBe(0);
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('return'));
    await screen.findByRole('heading', {name: 'reading'});
    expect(f.visit.hasActivitySnapshot('shape-control')).toBe(true);
    await act(() => f.router.navigate(1));
    await screen.findByText('reset');
    expect(f.state()).toEqual({value: 24, playing: false});
    fireEvent.click(screen.getByText('reset'));
    expect(f.state().value).toBe(0);
});

test('fresh activity return pushes reading; Back reopens the real preceding activity', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control']);
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('return'));
    await screen.findByRole('heading', {name: 'reading'});
    await act(() => f.router.navigate(-1));
    await screen.findByText('reset');
    expect(f.state()).toEqual({value: 24, playing: false});
});

test('different activities on one graph retain independent snapshots and free exploration adopts edits', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control']);
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('other activity'));
    await waitFor(() => expect(screen.getByTestId('activity')).toHaveTextContent('geometric-bounds'));
    expect(f.state().value).toBe(0);
    expect(f.visit.hasActivitySnapshot('shape-control')).toBe(true);
    fireEvent.click(screen.getByText('edit second'));
    fireEvent.click(screen.getByText('free'));
    await waitFor(() => expect(screen.getByTestId('activity')).toHaveTextContent('ordinary'));
    expect(f.state()).toEqual({value: 37, playing: false});
    expect(screen.getByTestId('url')).toHaveTextContent('/bezeg-2.0/bezier/curve');
    fireEvent.click(screen.getByText('shape activity'));
    await waitFor(() => expect(screen.getByTestId('activity')).toHaveTextContent('shape-control'));
    expect(f.state()).toEqual({value: 24, playing: false});
    fireEvent.click(screen.getByText('other activity'));
    await waitFor(() => expect(screen.getByTestId('activity')).toHaveTextContent('geometric-bounds'));
    expect(f.state()).toEqual({value: 37, playing: false});
});

test('invalid context normalizes by replacement while preserving unrelated query and hash', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve?chapter=oops&activity=shape-control&custom=yes#kept']);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/bezeg-2.0/bezier/curve?custom=yes#kept'));
    expect(f.graph.apply).not.toHaveBeenCalled();
});

test('ordinary read-about captures a separate paused scene that activities cannot overwrite', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve']);
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('read'));
    await screen.findByRole('heading', {name: 'reading'});
    fireEvent.click(screen.getByText('open'));
    expect(f.state().value).toBe(0);
    await act(() => f.router.navigate('/bezeg-2.0/bezier/curve', {state: {chapterRestore: true}}));
    expect(f.state()).toEqual({value: 24, playing: false});
});

test('capture failure keeps the ordinary scene and Retry repeats capture instead of restoring stale data', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve']);
    fireEvent.click(screen.getByText('edit'));
    vi.mocked(f.graph.captureState).mockImplementationOnce(() => { throw new Error('capture unavailable'); });
    fireEvent.click(screen.getByText('read'));
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(f.state().value).toBe(24);
    fireEvent.click(screen.getByText('retry'));
    await screen.findByRole('heading', {name: 'reading'});
    fireEvent.click(screen.getByText('open'));
    await screen.findByText('reset');
    fireEvent.click(screen.getByText('return'));
    await screen.findByRole('heading', {name: 'reading'});
    fireEvent.click(screen.getByText('graph'));
    expect(f.state()).toEqual({value: 24, playing: false});
});

test('departure capture failure retains last good snapshot and raises a destination notice', async () => {
    const f = fixture(['/bezeg-2.0/learn/bezier-curves']);
    fireEvent.click(screen.getByText('open'));
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('return'));
    await screen.findByRole('heading', {name: 'reading'});
    await act(() => f.router.navigate(1));
    expect(f.state()).toEqual({value: 24, playing: false});
    fireEvent.click(screen.getByText('edit second'));
    expect(f.state()).toEqual({value: 37, playing: true});
    vi.mocked(f.graph.captureState).mockImplementationOnce(() => { throw new Error('capture unavailable'); });
    await act(() => f.router.navigate(-1));
    expect(f.visit.hasActivitySnapshot('shape-control')).toBe(true);
    expect(navigationFailureSnapshot()).toBe(true);
    await act(() => f.router.navigate(1));
    expect(f.state()).toEqual({value: 24, playing: false});
});

test('history marker validates authored identity and retains only entry metadata across serialization', () => {
    const visit = new ChapterActivityVisit();
    const state = visit.activityEntryState({unrelated: 'keep'}, 'curve-parameter', 'abc123xy');
    const reloaded: unknown = JSON.parse(JSON.stringify(state));
    expect(visit.readActivityEntry(reloaded, 'curve-parameter')).toMatchObject({
        chapterId: 'bezier-curves', demonstrationId: 'decasteljau', predecessorReadingKey: 'abc123xy', started: false,
    });
    expect(visit.readActivityEntry(reloaded, 'repeated-interpolation')).toBeUndefined();
    expect(visit.readActivityEntry({chapterActivity: {activityId: 'curve-parameter'}}, 'curve-parameter')).toBeUndefined();
    expect(visit.readActivityEntry({...state, chapterActivity: {...state.chapterActivity, predecessorReadingKey: ''}}, 'curve-parameter')).toBeUndefined();
    for (const predecessorReadingKey of ['reading-key', 'ABC123XY', 'abc123x', 'abc123xy0']) {
        expect(visit.readActivityEntry({...state, chapterActivity: {...state.chapterActivity, predecessorReadingKey}}, 'curve-parameter')).toBeUndefined();
    }
    expect(state).toHaveProperty('unrelated', 'keep');
});

test('failed preparation still offers the registered named reading section', () => {
    fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds'], true);
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByTestId('return-path')).toHaveTextContent('/learn/bezier-curves#geometric-properties');
});

test('retry after failed authored start activates the session so departure captures later edits', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control'], true);
    expect(screen.getByText('error')).toBeInTheDocument();
    fireEvent.click(screen.getByText('allow preparation'));
    fireEvent.click(screen.getByText('retry'));
    expect(f.visit.isActivityActive('shape-control')).toBe(true);
    await waitFor(() => expect(screen.getByTestId('started')).toHaveTextContent('started'));
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('return'));
    await screen.findByRole('heading', {name: 'reading'});
    await act(() => f.router.navigate(-1));
    expect(f.state()).toEqual({value: 24, playing: false});
});

test('retry after lesson-close failure repeats Return without replaying the authored scene', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control']);
    const authoredActions = vi.mocked(f.graph.apply).mock.calls.length;
    fireEvent.click(screen.getByText('fail next lesson close'));
    fireEvent.click(screen.getByText('return'));
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByTestId('activity')).toHaveTextContent('shape-control');

    fireEvent.click(screen.getByText('retry'));
    await screen.findByRole('heading', {name: 'reading'});
    expect(vi.mocked(f.graph.apply).mock.calls.length).toBe(authoredActions);
});

test('malformed predecessor marker pushes the named section and Back returns to the real activity entry', async () => {
    const visit = new ChapterActivityVisit();
    const marker = visit.activityEntryState({}, 'shape-control', 'malformed-key');
    const f = fixture([
        '/bezeg-2.0/bezier/curve',
        '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control',
    ], false, marker);
    fireEvent.click(screen.getByText('return'));
    await screen.findByRole('heading', {name: 'reading'});
    expect(screen.getByTestId('url')).toHaveTextContent('/bezeg-2.0/learn/bezier-curves#control-points');
    await act(() => f.router.navigate(-1));
    await screen.findByText('reset');
    expect(screen.getByTestId('url')).toHaveTextContent('activity=shape-control');
});

test('impossible rollback disposes the failed graph', () => {
    const f = fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control']);
    fireEvent.click(screen.getByText('break rollback'));
    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('fatal')).toHaveTextContent('fatal');
    expect(f.disposeFailedGraph).toHaveBeenCalledOnce();
});

test('language and unrelated query changes do not replay the activity scene', async () => {
    const f = fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control']);
    const authoredActions = vi.mocked(f.graph.apply).mock.calls.length;
    fireEvent.click(screen.getByText('language rerender'));
    fireEvent.click(screen.getByText('unrelated query'));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('unrelated=yes#kept'));
    expect(vi.mocked(f.graph.apply).mock.calls.length).toBe(authoredActions);
});
