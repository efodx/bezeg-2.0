import React from 'react';
import {act, render} from '@testing-library/react';
import {message, setLanguage} from '../localization';
import {RefusalChannel, RefusalNotice} from './RefusalChannel';

const region = () => document.querySelector('[data-refusal-notice]')!;
afterEach(() => setLanguage('sl'));

test('a refusal is held alone, one at a time, and clear and refuse call the change callback only on a change', () => {
    const changed = vi.fn();
    const channel = new RefusalChannel(changed);
    channel.clear();
    expect(changed).not.toHaveBeenCalled();
    channel.refuse('prvi');
    channel.refuse('drugi');
    expect(channel.refusal).toBe('drugi');
    expect(changed).toHaveBeenCalledTimes(2);
    channel.clear();
    expect(channel.refusal).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(3);
});

test('the notice is its own polite status region, present when empty, and shows only the refusal', () => {
    const channel = new RefusalChannel();
    const view = render(<RefusalNotice channel={channel}/>);
    expect(region()).toHaveAttribute('role', 'status');
    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(region().textContent).toBe('');
    channel.refuse('Preveč točk.');
    view.rerender(<RefusalNotice channel={channel}/>);
    expect(view.container.textContent).toBe('Preveč točk.');
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
});

test('a localized refusal re-renders in the other language', () => {
    const channel = new RefusalChannel();
    channel.refuse(message('number_range_hint', {value0: 1, value1: 5}));
    render(<RefusalNotice channel={channel}/>);
    expect(region().textContent).toBe('Vnesi vrednost med 1 in 5.');
    act(() => setLanguage('en'));
    expect(region().textContent).toBe('Enter a value between 1 and 5.');
});

test('an equal message does not re-render on repeated drag frames, a different one does, and an announced refusal always does', () => {
    const changed = vi.fn();
    const channel = new RefusalChannel(changed);
    channel.refuse(message('number_range_hint', {value0: 1, value1: 5}));
    channel.refuse(message('number_range_hint', {value0: 1, value1: 5}));
    expect(changed).toHaveBeenCalledTimes(1);
    channel.refuse(message('number_range_hint', {value0: 1, value1: 6}));
    expect(changed).toHaveBeenCalledTimes(2);
    channel.refuse(message('number_range_hint', {value0: 1, value1: 6}), true);
    expect(changed).toHaveBeenCalledTimes(3);
    const before = channel.announcements;
    channel.refuse(message('number_range_hint', {value0: 1, value1: 6}));
    expect(channel.announcements).toBe(before);
});

test('a repeated announced refusal mounts a new line, so it is read again', () => {
    const channel = new RefusalChannel();
    channel.refuse('Preveč.', true);
    const view = render(<RefusalNotice channel={channel}/>);
    const first = view.container.querySelector('p');
    channel.refuse('Preveč.', true);
    view.rerender(<RefusalNotice channel={channel}/>);
    expect(view.container.querySelector('p')).not.toBe(first);
});
