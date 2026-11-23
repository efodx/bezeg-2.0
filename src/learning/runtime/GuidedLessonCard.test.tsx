import React from 'react';
import {createPortal} from 'react-dom';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {setLanguage} from '../../localization';
import type {LessonDefinition, LessonGraphCapabilities} from '../model';
import type {FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import {GuidedLesson} from './GuidedLesson';

beforeEach(() => {
    setLanguage('sl');
    (window as Window & {MathJax?: unknown}).MathJax = {
        startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise: vi.fn().mockResolvedValue(undefined),
    };
});

const declA: FrameDeclaration = {highlight: ['a' as never]};
const declB: FrameDeclaration = {uses: ['b' as never]};
const lesson: LessonDefinition = {
    id: 'card-test', demonstrationId: 'bezier', title: {sl: 'Kartica', en: 'Card'}, summary: {sl: 'Povzetek', en: 'Summary'},
    steps: [{
        id: 'only', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'},
        frames: [
            {id: 'one', kind: 'explanation', title: {sl: 'Prvi okvir', en: 'One'}, body: {sl: 'Telo', en: 'Body'}, declare: declA},
            {id: 'two', kind: 'explanation', title: {sl: 'Drugi okvir', en: 'Two'}, body: {sl: 'Telo', en: 'Body'}, declare: declB},
            {id: 'three', kind: 'explanation', title: {sl: 'Tretji okvir', en: 'Three'}, body: {sl: 'Telo', en: 'Body'}},
        ],
    }],
};

function graph() {
    const state = {value: 'prepared'};
    const capabilities: LessonGraphCapabilities & {state: typeof state} = {
        state,
        captureState: vi.fn(() => ({version: 1 as const, value: state.value})),
        restoreState: vi.fn(checkpoint => { state.value = checkpoint.value as string; }),
        apply: vi.fn(),
    };
    return capabilities;
}

const next = () => fireEvent.click(screen.getByRole('button', {name: 'Naprej: naslednji okvir'}));

test('moving the portal slot to another parent does not remount the lesson', () => {
    const caps = graph();
    const slot = document.createElement('div');
    const first = document.createElement('section');
    const second = document.createElement('section');
    document.body.append(first, second);
    first.append(slot);
    render(createPortal(<GuidedLesson lesson={lesson} capabilities={caps} onClose={vi.fn()}/>, slot));
    next();
    expect(screen.getByRole('heading', {name: 'Drugi okvir'})).toBeVisible();
    act(() => { second.append(slot); });
    // A remount would start a new session at the first frame and restore the graph on unmount.
    expect(screen.getByRole('heading', {name: 'Drugi okvir'})).toBeVisible();
    expect(second.querySelector('.guided-lesson')).not.toBeNull();
    expect(caps.restoreState).not.toHaveBeenCalled();
    expect(first.querySelector('.guided-lesson')).toBeNull();
    first.remove(); second.remove();
});

test('the frame declaration is reported for each frame and cleared on unmount', () => {
    const reports: (FrameDeclaration | undefined)[] = [];
    const {unmount} = render(<GuidedLesson lesson={lesson} capabilities={graph()} onClose={vi.fn()} registerFrameDeclaration={d => { reports.push(d); }}/>);
    const settled = () => reports.filter((report, index) => report !== reports[index - 1]);
    expect(reports[reports.length - 1]).toBe(declA);
    next();
    expect(reports[reports.length - 1]).toBe(declB);
    next();
    expect(reports[reports.length - 1]).toBeUndefined();
    expect(settled()).toContain(declA);
    expect(settled()).toContain(declB);
    unmount();
    expect(reports[reports.length - 1]).toBeUndefined();
    expect(reports.filter(report => report === declA)).not.toHaveLength(0);
});

test.each([undefined, 'card'] as const)('Povrni shows only while the graph differs from the frame (%s)', async presentation => {
    const caps = graph();
    render(<GuidedLesson lesson={lesson} capabilities={caps} onClose={vi.fn()} presentation={presentation}/>);
    const row = () => document.querySelector('.guided-lesson-restore-row');
    expect(screen.queryByRole('button', {name: 'Povrni'})).toBeNull();
    // The row is reserved in a card so its appearance never changes the card's height.
    expect(Boolean(row())).toBe(presentation === 'card');
    caps.state.value = 'edited';
    fireEvent.pointerUp(document.body);
    const restore = await screen.findByRole('button', {name: 'Povrni'});
    fireEvent.click(restore);
    expect(caps.state.value).toBe('prepared');
    await waitFor(() => expect(screen.queryByRole('button', {name: 'Povrni'})).toBeNull());
    expect(Boolean(row())).toBe(presentation === 'card');
});

test('a reading frame is read in a card with no drag, dock or hide controls, and explore folds through the callback', () => {
    const onRequestFold = vi.fn();
    const {container} = render(<GuidedLesson lesson={lesson} capabilities={graph()} onClose={vi.fn()} presentation="card" onRequestFold={onRequestFold}/>);
    const card = container.querySelector('.guided-lesson')!;
    expect(card).toHaveClass('guided-lesson-card');
    expect(card).not.toHaveClass('guided-lesson-docked');
    expect(card.getAttribute('style') ?? '').not.toContain('transform');
    expect(container.querySelector('.guided-lesson-grip, .guided-lesson-dock, .guided-lesson-hide, .guided-lesson-tab, .guided-lesson-graph-catcher')).toBeNull();
    expect(container.querySelector('.guided-lesson-navigation')).not.toBeNull();
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(onRequestFold).toHaveBeenCalledWith(true);
    expect(container.querySelector('.guided-lesson')).not.toBeNull();
});
