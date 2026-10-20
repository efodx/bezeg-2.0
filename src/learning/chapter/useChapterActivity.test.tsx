import React, {useRef} from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createMemoryRouter, RouterProvider, useLocation, useNavigate} from 'react-router-dom';
import {useChapterActivity, resolveActivityContext} from './useChapterActivity';
import {activitySnapshots, ordinarySnapshots, rememberActivityLaunch, activityEntryState, readActivityEntry} from './navigationMemory';
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

function fixture(initialEntries: string[], failPreparation = false) {
    let value = 10;
    let playing = false;
    const graph: LessonGraphCapabilities = {
        captureState: vi.fn((): LessonSceneCheckpoint => ({version: 1, value: {value, playing}})),
        restoreState: vi.fn((checkpoint: LessonSceneCheckpoint) => {
            const saved = checkpoint.value as {value: number; playing: boolean};
            value = saved.value; playing = saved.playing;
        }),
        apply: vi.fn(action => {
            if (failPreparation) throw new Error('preparation failed');
            if (action.kind === 'prepared-scene') value = 0;
        }),
        stopAnimations: () => { playing = false; }, pauseAnimations: () => { playing = false; }, isAvailable: () => true,
    };
    function Workspace() {
        const closeLesson = useRef<(() => void)>();
        const activity = useChapterActivity(graph, undefined, closeLesson);
        const location = useLocation();
        const navigate = useNavigate();
        return <><output data-testid="url">{location.pathname + location.search + location.hash}</output>
            <output data-testid="activity">{activity.activity?.id ?? 'ordinary'}</output>
            <output data-testid="return-path">{activity.returnPath}</output>
            <button onClick={() => { value = 24; playing = true; }}>edit</button>
            <button onClick={activity.returnToReading}>return</button>
            <button onClick={activity.reset}>reset</button>
            <button onClick={activity.freeExplore}>free</button>
            <button onClick={activity.readAbout}>read</button>
            <button onClick={activity.retry}>retry</button>
            <button onClick={() => navigate('/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds')}>other activity</button>
            <span>{activity.error ? 'error' : 'ready'}</span></>;
    }
    function Reading() {
        const navigate = useNavigate(); const location = useLocation();
        return <><h1>reading</h1><button onClick={() => {
            rememberActivityLaunch('shape-control', location.key);
            navigate('/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control', {
                state: activityEntryState(location.state, 'shape-control', location.key),
            });
        }}>open</button></>;
    }
    const router = createMemoryRouter([
        {path: '/bezeg-2.0/learn/bezier-curves', element: <Reading/>},
        {path: '/bezeg-2.0/bezier/curve', element: <Workspace/>},
    ], {initialEntries});
    render(<RouterProvider router={router}/>);
    return {router, graph, state: () => ({value, playing})};
}

beforeEach(() => { activitySnapshots.clear(); ordinarySnapshots.clear(); clearNavigationFailure(); });

test('chapter return traverses actual history, Forward restores paused edits, reset is explicit', async () => {
    const f = fixture(['/bezeg-2.0/learn/bezier-curves#control-points']);
    fireEvent.click(screen.getByText('open'));
    expect(f.state().value).toBe(0);
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('return'));
    await screen.findByRole('heading', {name: 'reading'});
    expect(activitySnapshots.get('shape-control')?.value).toEqual({value: 24, playing: false});
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
    expect(activitySnapshots.get('shape-control')?.value).toEqual({value: 24, playing: false});
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('free'));
    await waitFor(() => expect(screen.getByTestId('activity')).toHaveTextContent('ordinary'));
    expect(f.state()).toEqual({value: 24, playing: false});
    expect(screen.getByTestId('url')).toHaveTextContent('/bezeg-2.0/bezier/curve');
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
    expect(ordinarySnapshots.get('bezier')?.value).toEqual({value: 24, playing: false});
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
    expect(ordinarySnapshots.get('bezier')?.value).toEqual({value: 24, playing: false});
});

test('departure capture failure retains last good snapshot and raises a destination notice', async () => {
    const f = fixture(['/bezeg-2.0/learn/bezier-curves']);
    fireEvent.click(screen.getByText('open'));
    const saved: LessonSceneCheckpoint = {version: 1, value: {value: 5, playing: false}};
    activitySnapshots.set('shape-control', saved);
    vi.mocked(f.graph.captureState)
        .mockImplementationOnce(() => ({version: 1, value: {value: 0, playing: false}}))
        .mockImplementationOnce(() => { throw new Error('capture unavailable'); });
    await act(() => f.router.navigate(-1));
    expect(activitySnapshots.get('shape-control')).toBe(saved);
    expect(navigationFailureSnapshot()).toBe(true);
});

test('history marker validates authored identity and retains only entry metadata across serialization', () => {
    const state = activityEntryState({unrelated: 'keep'}, 'curve-parameter', 'reading-key');
    const reloaded: unknown = JSON.parse(JSON.stringify(state));
    expect(readActivityEntry(reloaded, 'curve-parameter')).toMatchObject({
        chapterId: 'bezier-curves', demonstrationId: 'decasteljau', predecessorReadingKey: 'reading-key', started: false,
    });
    expect(readActivityEntry(reloaded, 'repeated-interpolation')).toBeUndefined();
    expect(readActivityEntry({chapterActivity: {activityId: 'curve-parameter'}}, 'curve-parameter')).toBeUndefined();
    expect(state).toHaveProperty('unrelated', 'keep');
});

test('failed preparation still offers the registered named reading section', () => {
    fixture(['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds'], true);
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByTestId('return-path')).toHaveTextContent('/learn/bezier-curves#geometric-properties');
});
