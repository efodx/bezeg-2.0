import {DemonstrationPreviewPlayer, isFocusLeavingPreviewCard, playPreviewSafely, shouldAutomaticallyPlayPreview} from './demonstrationPreviewPlayer';
import type {DemonstrationMotionAsset} from './demonstrationMotionAssets';

const asset: DemonstrationMotionAsset = {src: '/clip.webm', type: 'video/webm', duration: 3};

test('keeps one active clip and ignores stop requests from a replaced card', () => {
    const player = new DemonstrationPreviewPlayer();
    const first = player.activate('repeated-subdivision', asset, false);
    const second = player.activate('bezier', asset, true);

    expect(player.active).toBe(second);
    expect(player.isCurrent('repeated-subdivision', first.generation)).toBe(false);
    expect(player.stop(first.demonstrationId, first.generation)).toBe(false);
    expect(player.active).toBe(second);
    expect(player.stop(second.demonstrationId, second.generation)).toBe(true);
    expect(player.active).toBeNull();
});

test('a delayed rejected play promise cannot stop or report failure for its replacement', async () => {
    const player = new DemonstrationPreviewPlayer();
    const old = player.activate('repeated-subdivision', asset, true);
    let rejectPlay!: (reason: Error) => void;
    const failure = vi.fn();
    const pending = playPreviewSafely(player, old, () => new Promise<void>((_resolve, reject) => { rejectPlay = reject; }), failure);
    const current = player.activate('bezier', asset, true);

    rejectPlay(new Error('old play rejected'));
    await pending;
    expect(failure).not.toHaveBeenCalled();
    expect(player.active).toBe(current);
});

test('reports a current play failure so the owner can return to its poster', async () => {
    const player = new DemonstrationPreviewPlayer();
    const active = player.activate('bezier', asset, true);
    const failure = vi.fn(() => player.stop(active.demonstrationId, active.generation));

    await playPreviewSafely(player, active, () => Promise.reject(new Error('unsupported media')), failure);

    expect(failure).toHaveBeenCalledOnce();
    expect(player.active).toBeNull();
});

test('a stale completion event cannot clear the currently playing card', () => {
    const player = new DemonstrationPreviewPlayer();
    const first = player.activate('repeated-subdivision', asset, false);
    const second = player.activate('bezier', asset, true);

    if (player.isCurrent(first.demonstrationId, first.generation)) player.stop(first.demonstrationId, first.generation);
    expect(player.active).toBe(second);
});

test('focus moves among card descendants stay in the same entry', () => {
    const card = document.createElement('li');
    const title = document.createElement('a');
    const action = document.createElement('button');
    card.append(title, action);
    const contains = (target: EventTarget | null) => target instanceof Node && card.contains(target);

    expect(isFocusLeavingPreviewCard(contains, action)).toBe(false);
    expect(isFocusLeavingPreviewCard(contains, document.body)).toBe(true);
    expect(isFocusLeavingPreviewCard(contains, null)).toBe(true);
});

test('automatic playback respects reduced motion and only starts once per entry', () => {
    expect(shouldAutomaticallyPlayPreview(false, true, false)).toBe(true);
    expect(shouldAutomaticallyPlayPreview(true, true, false)).toBe(false);
    expect(shouldAutomaticallyPlayPreview(false, false, false)).toBe(false);
    expect(shouldAutomaticallyPlayPreview(false, true, true)).toBe(false);
});
