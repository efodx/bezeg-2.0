import {SceneStore} from './SceneStore';

interface State {
    a: number;
    b: string;
}

test('setState applies synchronously and replaces the state object', () => {
    const store = new SceneStore<State>({a: 1, b: 'x'});
    const before = store.getState();
    expect(store.setState({a: 2})).toBe(true);
    expect(store.getState()).toEqual({a: 2, b: 'x'});
    expect(store.getState()).not.toBe(before);
    expect(before).toEqual({a: 1, b: 'x'});
});

test('a function update reads the state written by the update before it', () => {
    const store = new SceneStore<State>({a: 1, b: 'x'});
    store.setState(state => ({a: state.a + 1}));
    store.setState(state => ({a: state.a * 10}));
    expect(store.getState().a).toBe(20);
});

test('an update returning null changes nothing and does not notify', () => {
    const store = new SceneStore<State>({a: 1, b: 'x'});
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getState();
    const version = store.getVersion();
    expect(store.setState(() => null)).toBe(false);
    expect(store.getState()).toBe(before);
    expect(store.getVersion()).toBe(version);
    expect(listener).not.toHaveBeenCalled();
});

test('every change and every notify bumps the version and calls subscribers', () => {
    const store = new SceneStore<State>({a: 1, b: 'x'});
    const listener = vi.fn();
    store.subscribe(listener);
    const start = store.getVersion();
    store.setState({a: 2});
    store.notify();
    store.replaceState({a: 5, b: 'y'});
    expect(store.getVersion()).toBe(start + 3);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(store.getState()).toEqual({a: 5, b: 'y'});
});

test('subscribers see the new state and can unsubscribe, also while notifying', () => {
    const store = new SceneStore<State>({a: 1, b: 'x'});
    const seen: number[] = [];
    const unsubscribeFirst = store.subscribe(() => {
        seen.push(store.getState().a);
        unsubscribeFirst();
    });
    const second = vi.fn();
    const unsubscribeSecond = store.subscribe(second);
    store.setState({a: 2});
    store.setState({a: 3});
    unsubscribeSecond();
    unsubscribeSecond();
    store.setState({a: 4});
    expect(seen).toEqual([2]);
    expect(second).toHaveBeenCalledTimes(2);
});
