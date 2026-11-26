import {expect, test} from 'vitest';
import {AUTOFIT_STORAGE_KEY, createAutofitSwitch} from './autofitSwitch';

test('a choice made this session wins over the stored value even when saving it fails', () => {
    const stored = new Map<string, string>([[AUTOFIT_STORAGE_KEY, 'off']]);
    const storage = {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
    };
    const autofit = createAutofitSwitch(() => storage);
    expect(autofit.get()).toBe(false);
    let notified = 0;
    autofit.subscribe(() => { notified++; });
    autofit.set(true);
    expect(autofit.get()).toBe(true);
    expect(notified).toBe(1);
    autofit.set(false);
    expect(autofit.get()).toBe(false);
});

test('without a choice this session the stored value decides', () => {
    const stored = new Map<string, string>([[AUTOFIT_STORAGE_KEY, 'off']]);
    const autofit = createAutofitSwitch(() => ({getItem: key => stored.get(key) ?? null, setItem: (key, value) => { stored.set(key, value); }}));
    expect(autofit.get()).toBe(false);
});
