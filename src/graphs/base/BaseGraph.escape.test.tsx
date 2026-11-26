import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {RangePuck} from '../../workspace/pucks/RangePuck';
import {message} from '../../localization';
import {allGraphFactories as graphFactories} from '../allGraphFactories';
import {appStorage} from '../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from './realGraphTestHarness';
import {t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

async function mountPlaying() {
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
    await waitForPucks('decasteljau-t');
    act(() => { fireEvent.click(screen.getByRole('button', {name: t('play')})); });
    frames(2);
    expect(graph.state.animationStatus).toBe('playing');
    return {graph, frames, unmount: () => mounted.view.unmount()};
}

test('Escape pauses a playing graph and ends its leases', async () => {
    const {graph, frames} = await mountPlaying();
    expect(graph.parameters!.activeLeases()).toHaveLength(1);
    act(() => { fireEvent.keyDown(document.body, {key: 'Escape'}); });
    expect(graph.state.animationStatus).toBe('paused');
    expect(graph.parameters!.activeLeases()).toHaveLength(0);
    const at = graph.parameters!.read('decasteljau-t');
    frames(3);
    expect(graph.parameters!.read('decasteljau-t')).toBe(at);
});

test('Escape inside a dialog or a menu, or already used by a control, leaves the playback running', async () => {
    const {graph} = await mountPlaying();
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

test('the Escape listener is removed with the graph', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const {unmount} = await mountPlaying();
    unmount();
    expect(remove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
});

test('the Escape that undoes a puck jump also stops the running animation, and the value stays still', async () => {
    const {graph, frames} = await mountPlaying();
    const onWrite = vi.fn();
    const view = render(<RangePuck parameter={{kind: 'range', key: 'x', label: message('shell_card_tools'), placement: 'board', min: 0, max: 10, step: 1}} value={0} onWrite={onWrite}/>);
    const puck = within(view.container);
    const slider = puck.getByRole('slider');
    fireEvent.keyDown(slider, {key: 'Enter'});
    const input = puck.getByRole('textbox');
    fireEvent.change(input, {target: {value: '8'}});
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(puck.getByRole('button', {name: /Razveljavi/})).toBeInTheDocument();
    act(() => { fireEvent.keyDown(document.body, {key: 'Escape'}); });
    expect(onWrite).toHaveBeenLastCalledWith(0);
    expect(graph.state.animationStatus).toBe('paused');
    const at = graph.parameters!.read('decasteljau-t');
    frames(3);
    expect(graph.parameters!.read('decasteljau-t')).toBe(at);
    view.unmount();
});
