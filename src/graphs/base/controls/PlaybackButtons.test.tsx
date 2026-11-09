import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';
import {describe, expect, test, vi} from 'vitest';
import {PlaybackButtons, playbackBlocks} from './PlaybackButtons';
import type {PlaybackBlocks} from './PlaybackButtons';

const button = (action: string) => document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
const reasonLine = () => document.querySelector('[data-playback-reason]');

function buttons(blocks: Partial<PlaybackBlocks>, handlers: Partial<Record<'onNext' | 'onPlayPause' | 'onReset', () => void>> = {}, playing = false) {
    return <PlaybackButtons groupLabel="Iteration" nextLabel="Next" playing={playing} onNext={() => {}} onPlayPause={() => {}} onReset={() => {}}
                            {...blocks} {...handlers}/>;
}

describe('playbackBlocks', () => {
    const middle = {atStart: false, atEnd: false, playing: false};

    test('nothing is blocked in the middle of a run', () => {
        expect(playbackBlocks(middle)).toEqual({nextBlock: undefined, playBlock: undefined, resetBlock: undefined});
    });

    test('at the end next and play have no more steps; pause and reset stay available while playing', () => {
        expect(playbackBlocks({...middle, atEnd: true})).toMatchObject({nextBlock: 'no-more-steps', playBlock: 'no-more-steps', resetBlock: undefined});
        expect(playbackBlocks({...middle, atEnd: true, playing: true})).toMatchObject({nextBlock: 'no-more-steps', playBlock: undefined});
    });

    test('at the start only reset is blocked, and playback lifts it', () => {
        expect(playbackBlocks({...middle, atStart: true})).toEqual({nextBlock: undefined, playBlock: undefined, resetBlock: 'at-start'});
        expect(playbackBlocks({...middle, atStart: true, playing: true}).resetBlock).toBeUndefined();
    });

    test('next waits for playback unless the graph steps while playing', () => {
        expect(playbackBlocks({...middle, playing: true}).nextBlock).toBe('playing');
        expect(playbackBlocks({...middle, playing: true, stepsWhilePlaying: true}).nextBlock).toBeUndefined();
    });

    test('an input with no run blocks all three', () => {
        expect(playbackBlocks({...middle, ready: false, playing: true})).toEqual({nextBlock: 'no-run', playBlock: 'no-run', resetBlock: 'no-run'});
    });
});

describe('PlaybackButtons', () => {
    test('an available button runs its action and carries no reason', () => {
        const onNext = vi.fn();
        render(buttons({}, {onNext}));
        fireEvent.click(button('next-step'));
        expect(onNext).toHaveBeenCalledTimes(1);
        expect(button('next-step').getAttribute('aria-disabled')).toBe('false');
        expect(button('next-step').hasAttribute('title')).toBe(false);
        expect(button('next-step').hasAttribute('aria-describedby')).toBe(false);
    });

    test('a blocked button keeps focus, runs nothing and gives its reason in title and description', () => {
        const onReset = vi.fn();
        render(buttons({resetBlock: 'at-start'}, {onReset}));
        const reset = button('reset');
        reset.focus();
        fireEvent.click(reset);
        expect(onReset).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(reset);
        expect(reset.getAttribute('aria-disabled')).toBe('true');
        expect(reset.title).toBe('Prikaz je že na začetku.');
        expect(document.getElementById(reset.getAttribute('aria-describedby')!)?.textContent).toBe('Prikaz je že na začetku.');
        expect(reset.textContent).toBe('Ponastavi');
    });

    test('pressing a blocked button shows the reason until the button is available', () => {
        const {rerender} = render(buttons({nextBlock: 'playing'}));
        expect(reasonLine()).toBeNull();
        fireEvent.click(button('next-step'));
        expect(screen.getByRole('status').textContent).toBe('Med predvajanjem korak ni na voljo. Najprej pritisni Premor.');
        rerender(buttons({nextBlock: 'no-more-steps'}));
        expect(screen.getByRole('status').textContent).toBe('Ni več korakov.');
        rerender(buttons({}));
        expect(reasonLine()).toBeNull();
    });

    test('pressing an available button clears the reason', () => {
        render(buttons({nextBlock: 'no-run'}));
        fireEvent.click(button('next-step'));
        expect(reasonLine()).not.toBeNull();
        fireEvent.click(button('play-pause'));
        expect(reasonLine()).toBeNull();
    });

    test('a further button joins the group after the three', () => {
        render(<PlaybackButtons groupLabel="Iteration" nextLabel="Next" playing={false} onNext={() => {}} onPlayPause={() => {}} onReset={() => {}}>
            <button type="button" data-action="reset-view">View</button>
        </PlaybackButtons>);
        const group = screen.getByRole('group', {name: 'Iteration'});
        expect([...group.querySelectorAll('button')].map(element => element.dataset.action)).toEqual(['next-step', 'play-pause', 'reset', 'reset-view']);
    });

    test('the group keeps its label, and play turns into pause', () => {
        render(buttons({}, {}, true));
        expect(screen.getByRole('group', {name: 'Iteration'}).className).toBe('inspector-playback');
        expect(button('play-pause').textContent).toBe('Premor');
    });

    test('a button whose handler is absent is left out: a continuous run shows only Play and, with a handler, Reset', () => {
        const {rerender} = render(<PlaybackButtons groupLabel="Run" playing={false} onPlayPause={() => {}}/>);
        const actions = () => [...screen.getByRole('group', {name: 'Run'}).querySelectorAll('button')].map(element => element.dataset.action);
        expect(actions()).toEqual(['play-pause']);
        rerender(<PlaybackButtons groupLabel="Run" playing={false} onPlayPause={() => {}} onReset={() => {}}/>);
        expect(actions()).toEqual(['play-pause', 'reset']);
    });

    test('the reduced-motion reason blocks Play, keeps focus and says why when pressed', () => {
        const onPlayPause = vi.fn();
        render(<PlaybackButtons groupLabel="Run" playing={false} playBlock="reduced-motion" onPlayPause={onPlayPause}/>);
        const play = button('play-pause');
        play.focus();
        fireEvent.click(play);
        expect(onPlayPause).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(play);
        expect(play.getAttribute('aria-disabled')).toBe('true');
        expect(play.title).toBe('Sistem je nastavljen na manj gibanja, zato predvajanje ni na voljo. Parameter premikajte z drsnikom.');
        expect(screen.getByRole('status').textContent).toBe(play.title);
    });
});

describe('the leading slot', () => {
    test('renders its buttons before Next, Play and Reset inside the group', () => {
        render(<PlaybackButtons groupLabel="Iteration" nextLabel="Next" playing={false} onNext={() => {}} onPlayPause={() => {}} onReset={() => {}}
                                leading={<button data-action="previous-step">Previous</button>}>
            <button data-action="extra">New</button>
        </PlaybackButtons>);
        const order = Array.from(screen.getByRole('group', {name: 'Iteration'}).querySelectorAll('button')).map(b => b.getAttribute('data-action'));
        expect(order).toEqual(['previous-step', 'next-step', 'play-pause', 'reset', 'extra']);
    });
});
