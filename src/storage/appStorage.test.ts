import {NamespacedStorage} from './appStorage';

beforeEach(() => localStorage.clear());

test('namespaced keys stay separate and clear only removes this release data', () => {
    const storage = new NamespacedStorage(() => localStorage, 'release:');
    localStorage.setItem('preset-bezier-curve', 'original app');
    storage.setItem('preset-bezier-curve', 'release app');

    expect(storage.getItem('preset-bezier-curve')).toBe('release app');
    expect(storage.key(0)).toBe('preset-bezier-curve');
    expect(storage.length).toBe(1);
    storage.clear();
    expect(localStorage.getItem('preset-bezier-curve')).toBe('original app');
    expect(storage.length).toBe(0);
});
