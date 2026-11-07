import {DomainError} from '../../functions/BaseFunctionGraph';
import {message} from '../../../localization';
import {RefusalChannel} from '../../../inputs/RefusalChannel';
import {guard} from './guard';

test('an accepted edit runs, returns true and leaves the channel empty', () => {
    const channel = new RefusalChannel();
    const action = vi.fn();
    expect(guard(channel, action)).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(channel.refusal).toBeUndefined();
});

test('a DomainError becomes the refusal: its message when it has one, else its text', () => {
    const channel = new RefusalChannel();
    const reason = message('number_rejected_hint');
    expect(guard(channel, () => { throw new DomainError(reason); })).toBe(false);
    expect(channel.refusal).toBe(reason);
    expect(guard(channel, () => { throw new DomainError('Pregrobo.'); })).toBe(false);
    expect(channel.refusal).toBe('Pregrobo.');
});

test('an accepted edit, even a no-op, clears an earlier refusal', () => {
    const channel = new RefusalChannel();
    guard(channel, () => { throw new DomainError('Pregrobo.'); });
    expect(channel.refusal).toBe('Pregrobo.');
    expect(guard(channel, () => undefined)).toBe(true);
    expect(channel.refusal).toBeUndefined();
});

test('anything but a DomainError is rethrown and leaves the channel as it was', () => {
    const channel = new RefusalChannel();
    channel.refuse('Staro.');
    expect(() => guard(channel, () => { throw new TypeError('hrošč'); })).toThrow(TypeError);
    expect(channel.refusal).toBe('Staro.');
});
