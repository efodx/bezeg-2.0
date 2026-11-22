import {act, fireEvent, screen} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../allGraphFactories';
import {appStorage} from '../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from './realGraphTestHarness';
import {t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

function mountPlaying() {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const mounted = mountGraph(graphFactories.decasteljau());
    const graph = mounted.graph as typeof mounted.graph & {state: {animationStatus: string}};
    const frames = (count: number) => {
        for (let i = 0; i < count; i++) {
            const due = pending;
            pending = [];
            time += 100;
            act(() => due.forEach(callback => callback(time)));
        }
    };
    act(() => { fireEvent.click(screen.getByRole('button', {name: t('play')})); });
    frames(2);
    expect(graph.state.animationStatus).toBe('playing');
    return {graph, frames, unmount: () => mounted.view.unmount()};
}

test('Escape pauses a playing graph and ends its leases', () => {
    const {graph, frames} = mountPlaying();
    expect(graph.parameters!.activeLeases()).toHaveLength(1);
    act(() => { fireEvent.keyDown(document.body, {key: 'Escape'}); });
    expect(graph.state.animationStatus).toBe('paused');
    expect(graph.parameters!.activeLeases()).toHaveLength(0);
    const at = graph.parameters!.read('decasteljau-t');
    frames(3);
    expect(graph.parameters!.read('decasteljau-t')).toBe(at);
});

test('Escape inside a dialog or a menu, or already used by a control, leaves the playback running', () => {
    const {graph} = mountPlaying();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const inner = document.createElement('button');
    dialog.appendChild(inner);
    document.body.appendChild(dialog);
    act(() => { fireEvent.keyDown(inner, {key: 'Escape'}); });
    expect(graph.state.animationStatus).toBe('playing');
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);
    act(() => { fireEvent.keyDown(menu, {key: 'Escape'}); });
    expect(graph.state.animationStatus).toBe('playing');
    const handled = document.createElement('input');
    handled.addEventListener('keydown', event => event.preventDefault());
    document.body.appendChild(handled);
    act(() => { fireEvent.keyDown(handled, {key: 'Escape'}); });
    expect(graph.state.animationStatus).toBe('playing');
    dialog.remove();
    menu.remove();
    handled.remove();
});

test('the Escape listener is removed with the graph', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const {unmount} = mountPlaying();
    unmount();
    expect(remove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
});
