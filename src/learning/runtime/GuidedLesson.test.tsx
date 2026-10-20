import React from 'react';
import {act} from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {setLanguage} from '../../localization';
import type {LessonDefinition, LessonGraphCapabilities} from '../model';
import {GuidedLesson} from './GuidedLesson';
import {LessonSession} from './LessonSession';
import type {Mock} from 'vitest';

const lesson: LessonDefinition = {
    id: 'accessible-test', demonstrationId: 'bezier', title: {sl: 'Vodena pot', en: 'Guided path'}, summary: {sl: 'Povzetek', en: 'Summary'},
    steps: [
        {
            id: 'first', title: {sl: 'Prvi korak', en: 'First step'}, body: {sl: 'Razlaga', en: 'Explanation'},
            notation: [{sl: '\\[P_i^{(r)}=(1-t)P_i^{(r-1)}+tP_{i+1}^{(r-1)}\\]', en: '\\[P_i^{(r)}=(1-t)P_i^{(r-1)}+tP_{i+1}^{(r-1)}\\]'}],
        },
        {id: 'last', title: {sl: 'Drugi korak', en: 'Second step'}, body: {sl: 'Konec', en: 'The end'}},
    ],
};

function capabilities(): LessonGraphCapabilities {
    return {captureState: () => ({version: 1, value: 'before'}), restoreState: vi.fn(), apply: vi.fn()};
}

const framedLesson: LessonDefinition = {
    id: 'framed-ui-test', demonstrationId: 'decasteljau', title: {sl: 'Konstrukcija', en: 'Construction'}, summary: {sl: 'Povzetek', en: 'Summary'},
    steps: [{
        id: 'first', title: {sl: 'Prvi korak', en: 'First step'}, body: {sl: 'Razlaga', en: 'Explanation'},
        frames: [
            {id: 'first-explanation', kind: 'explanation', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Telo', en: 'Body'}},
            {id: 'first-observation', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Opazuj', en: 'Observe'}, animation: {animationId: 'decasteljau'}},
        ],
    }],
};

const observationFirstLesson: LessonDefinition = {
    id: 'observation-first-test', demonstrationId: 'bezier', title: {sl: 'Opazovanje prvo', en: 'Observation first'}, summary: {sl: 'Povzetek', en: 'Summary'},
    steps: [{
        id: 'first', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'},
        frames: [
            {id: 'intro', kind: 'explanation', title: {sl: 'Uvod', en: 'Intro'}, body: {sl: 'Telo', en: 'Body'}},
            {id: 'obs', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Opazuj', en: 'Observe'}},
            {id: 'closing', kind: 'explanation', title: {sl: 'Zaključek', en: 'Conclusion'}, body: {sl: 'Telo', en: 'Body'}},
        ],
    }],
};

const frameActionLesson: LessonDefinition = {
    id: 'frame-action-test', demonstrationId: 'bezier', title: {sl: 'Dejanje', en: 'Action'}, summary: {sl: 'Povzetek', en: 'Summary'},
    steps: [{
        id: 'first', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'},
        frames: [
            {id: 'explanation', kind: 'explanation', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Telo', en: 'Body'}},
            {id: 'observation', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Opazuj', en: 'Observe'}, action: {
                label: {sl: 'Pokaži poligon', en: 'Show polygon'},
                action: {kind: 'curve-visibility', target: 'control-polygon', visible: true},
            }},
        ],
    }],
};

const denseLesson: LessonDefinition = {
    id: 'dense-ui-test', demonstrationId: 'decasteljau', title: {sl: 'Konstrukcija', en: 'Construction'}, summary: {sl: 'Povzetek', en: 'Summary'},
    steps: [{
        id: 'first', title: {sl: 'Prvi korak', en: 'First step'}, body: {sl: 'Razlaga', en: 'Explanation'},
        frames: [
            {id: 'dense-explanation', kind: 'explanation', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Telo', en: 'Body'}},
            {id: 'dense-calculation', kind: 'calculation', title: {sl: 'Izračun', en: 'Calculation'}, body: {sl: 'Račun', en: 'Calculation'}},
            {id: 'dense-observation', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Opazuj', en: 'Observe'}},
        ],
    }],
};

function observe() {
    fireEvent.click(screen.getByRole('button', {name: 'Opazuj na grafu'}));
    act(() => vi.advanceTimersByTime(250));
}

test('offers content-first navigation and preserves step identity when language changes', () => {
    setLanguage('sl');
    const close = vi.fn();
    render(<GuidedLesson lesson={lesson} capabilities={capabilities()} onClose={close}/>);
    expect(screen.getByRole('heading', {name: 'Prvi korak'})).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Korak 1 od 2');
    expect(screen.getByRole('button', {name: 'Končaj učno pot'})).toHaveClass('guided-lesson-exit');
    const backButton = screen.getByRole('button', {name: 'Nazaj'});
    const nextButton = screen.getByRole('button', {name: 'Naprej'});
    expect(backButton).toHaveClass('guided-lesson-nav-back');
    expect(nextButton).toHaveClass('guided-lesson-nav-next');
    expect(backButton).toHaveTextContent(/^Nazaj$/);
    expect(nextButton).toHaveTextContent(/^Naprej$/);
    expect(screen.queryByRole('button', {name: 'Ponastavi'})).not.toBeInTheDocument();
    const notation = document.querySelector('.guided-lesson-notation');
    expect(notation).toHaveTextContent('\\[P_i^{(r)}=(1-t)P_i^{(r-1)}+tP_{i+1}^{(r-1)}\\]');
    expect(notation?.querySelector('code')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
    expect(screen.getByRole('heading', {name: 'Drugi korak'})).toBeVisible();
    act(() => setLanguage('en'));
    expect(screen.getByRole('heading', {name: 'Second step'})).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Step 2 of 2');
    fireEvent.click(screen.getByRole('button', {name: 'Exit lesson'}));
    expect(close).toHaveBeenCalled();
    act(() => setLanguage('sl'));
});

test('hides instructions without ending the session and reopens the same frame', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const caps = capabilities();
        let showInstructions: (() => void) | undefined;
        const started = vi.spyOn(LessonSession.prototype, 'start');
        const {container} = render(<GuidedLesson lesson={denseLesson} capabilities={caps} onClose={vi.fn()}
            registerShowInstructions={show => { showInstructions = show; }}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        act(() => vi.advanceTimersByTime(250));

        expect(document.querySelector('.guided-lesson-content')).toBeInTheDocument();
        expect(screen.getByText('Opazuj', {selector: 'p'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Nazaj'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Nadaljuj učno pot'})).toBeVisible();

        fireEvent.click(screen.getByRole('button', {name: 'Opazuj na grafu'}));
        expect(document.querySelector('.guided-lesson-handoff-closing')).toBeInTheDocument();
        act(() => vi.advanceTimersByTime(250));
        expect(container.querySelector('.guided-lesson')).not.toBeInTheDocument();
        expect(started).toHaveBeenCalledTimes(1);

        act(() => showInstructions?.());
        act(() => vi.advanceTimersByTime(250));
        expect(screen.getByRole('button', {name: 'Opazuj na grafu'})).toBeVisible();
        expect(screen.getByText('Opazuj', {selector: 'p'})).toBeVisible();
        expect(screen.getByRole('status')).toHaveTextContent('Okvir 3 od 3');
        expect(screen.getByRole('button', {name: 'Nadaljuj učno pot'})).toBeVisible();
        expect(started).toHaveBeenCalledTimes(1);
    } finally {
        vi.useRealTimers();
        vi.restoreAllMocks();
        act(() => setLanguage('sl'));
    }
});

test('rapidly reopening during the closing handoff restores panel focus without changing the lesson scene', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn()})));
    setLanguage('sl');
    try {
        const caps = capabilities();
        const started = vi.spyOn(LessonSession.prototype, 'start');
        let showInstructions: (() => void) | undefined;
        render(<GuidedLesson lesson={denseLesson} capabilities={caps} onClose={vi.fn()}
            registerShowInstructions={show => { showInstructions = show; }}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        expect(screen.getByRole('status')).toHaveTextContent('Okvir 3 od 3');

        fireEvent.click(screen.getByRole('button', {name: 'Opazuj na grafu'}));
        expect(document.querySelector('.guided-lesson-handoff-closing')).toBeInTheDocument();
        act(() => showInstructions?.());

        const panel = document.querySelector('.guided-lesson');
        expect(panel).toBeInTheDocument();
        expect(panel).toHaveClass('guided-lesson-handoff-opening');
        expect(panel).toHaveFocus();
        expect(screen.getByRole('status')).toHaveTextContent('Okvir 3 od 3');
        expect(screen.getByText('Opazuj', {selector: 'p'})).toBeVisible();
        expect(started).toHaveBeenCalledTimes(1);
        expect(caps.apply).not.toHaveBeenCalled();
    } finally {
        vi.unstubAllGlobals();
        vi.useRealTimers();
        vi.restoreAllMocks();
        act(() => setLanguage('sl'));
    }
});

test('keeps the graph locked while instructions are visible and unlocks it only when hidden', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const onModeChange = vi.fn();
        let showInstructions: (() => void) | undefined;
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={vi.fn()} onModeChange={onModeChange}
            registerShowInstructions={show => { showInstructions = show; }}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        expect(onModeChange).toHaveBeenLastCalledWith('content');
        observe();
        expect(onModeChange).toHaveBeenLastCalledWith('explore');
        act(() => showInstructions?.());
        act(() => vi.advanceTimersByTime(250));
        expect(onModeChange).toHaveBeenLastCalledWith('content');
        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        act(() => vi.advanceTimersByTime(250));
        expect(onModeChange).toHaveBeenLastCalledWith('complete');
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('Escape from outside the panel hides instructions without exiting the lesson', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const onClose = vi.fn();
        const onModeChange = vi.fn();
        render(<GuidedLesson lesson={lesson} capabilities={capabilities()} onClose={onClose} onModeChange={onModeChange}/>);
        const event = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        act(() => vi.advanceTimersByTime(250));
        expect(document.querySelector('.guided-lesson')).not.toBeInTheDocument();
        expect(onModeChange).toHaveBeenLastCalledWith('explore');
        expect(onClose).not.toHaveBeenCalled();
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('Continue advances to the next frame and opens its overlay', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        let showInstructions: (() => void) | undefined;
        render(<GuidedLesson lesson={observationFirstLesson} capabilities={capabilities()} onClose={vi.fn()}
            registerShowInstructions={show => { showInstructions = show; }}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        expect(screen.getByRole('button', {name: 'Opazuj na grafu'})).toBeVisible();
        observe();
        act(() => showInstructions?.());
        act(() => vi.advanceTimersByTime(250));
        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        act(() => vi.advanceTimersByTime(250));
        expect(screen.getByRole('heading', {name: 'Zaključek'})).toBeVisible();
        expect(screen.getByRole('status')).toHaveTextContent('Okvir 3 od 3');
        expect(screen.queryByRole('button', {name: 'Opazuj na grafu'})).not.toBeInTheDocument();
        expect(screen.queryByText('Opazuj', {selector: 'p'})).not.toBeInTheDocument();
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('Continue on the last observation frame completes the lesson', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        let showInstructions: (() => void) | undefined;
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={vi.fn()}
            registerShowInstructions={show => { showInstructions = show; }}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        observe();
        act(() => showInstructions?.());
        act(() => vi.advanceTimersByTime(250));
        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        act(() => vi.advanceTimersByTime(250));
        expect(document.querySelector('.guided-lesson-complete')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Nadaljuj učno pot'})).not.toBeInTheDocument();
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('Back from an observation overlay returns to the previous frame', () => {
    setLanguage('sl');
    render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
    fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
    expect(screen.getByRole('button', {name: 'Opazuj na grafu'})).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Nazaj'}));
    expect(screen.getByRole('heading', {name: 'Izračun'})).toBeVisible();
    expect(screen.queryByRole('button', {name: 'Opazuj na grafu'})).not.toBeInTheDocument();
});

test('pauses graph animation when hiding instructions and reopening does not restart it', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const apply = vi.fn();
        let showInstructions: (() => void) | undefined;
        render(<GuidedLesson lesson={framedLesson} capabilities={{...capabilities(), apply}} onClose={vi.fn()}
            registerShowInstructions={show => { showInstructions = show; }}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        const controls = screen.getByRole('group', {name: 'Kontrole animacije konstrukcije'});
        expect(controls.closest('.guided-lesson-exploration')).not.toBeNull();
        expect(controls.querySelectorAll('svg.guided-lesson-animation-icon')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', {name: /Predvajaj/}));
        expect(apply).toHaveBeenLastCalledWith({kind: 'animation', animationId: 'decasteljau', command: 'play'});

        fireEvent.click(screen.getByRole('button', {name: 'Skrij navodila učne poti'}));
        expect(apply).toHaveBeenLastCalledWith({kind: 'animation', animationId: 'decasteljau', command: 'pause'});
        act(() => vi.advanceTimersByTime(250));
        expect(document.querySelector('.guided-lesson')).not.toBeInTheDocument();
        act(() => showInstructions?.());
        act(() => vi.advanceTimersByTime(250));
        expect(screen.getByRole('group', {name: 'Kontrole animacije konstrukcije'})).toBeVisible();
        expect(apply.mock.calls.filter(([command]) => command?.kind === 'animation' && command.command === 'play')).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        act(() => vi.advanceTimersByTime(250));
        expect(document.querySelector('.guided-lesson-complete')).toBeInTheDocument();
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('does not pause playback that the observation never started', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const apply = vi.fn();
        render(<GuidedLesson lesson={framedLesson} capabilities={{...capabilities(), apply}} onClose={vi.fn()}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Skrij navodila učne poti'}));
        act(() => vi.advanceTimersByTime(250));
        expect(apply).not.toHaveBeenCalledWith(expect.objectContaining({kind: 'animation'}));
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('applies an action declared by the current frame', () => {
    setLanguage('sl');
    const apply = vi.fn();
    render(<GuidedLesson lesson={frameActionLesson} capabilities={{...capabilities(), apply}} onClose={vi.fn()}/>);

    fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
    fireEvent.click(screen.getByRole('button', {name: 'Pokaži poligon'}));
    expect(apply).toHaveBeenCalledWith({kind: 'curve-visibility', target: 'control-polygon', visible: true});
});

test('uses Next as the only forward lesson command', () => {
    setLanguage('sl');
    render(<GuidedLesson lesson={framedLesson} capabilities={capabilities()} onClose={vi.fn()}/>);

    expect(screen.queryByRole('button', {name: 'Razišči v grafu'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Naprej'})).toBeVisible();
    act(() => setLanguage('sl'));
});

test('skips MathJax work for a frame without mathematics', async () => {
    setLanguage('sl');
    const win = window as Window & {MathJax?: {startup: {promise: Promise<unknown>}; typesetClear: Mock; typesetPromise: Mock}};
    const previousMathJax = win.MathJax;
    const typesetPromise = vi.fn((..._args: unknown[]) => Promise.resolve());
    win.MathJax = {startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise};

    try {
        render(<GuidedLesson lesson={framedLesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        await act(async () => { await Promise.resolve(); });
        expect(typesetPromise).not.toHaveBeenCalled();
    } finally {
        if (previousMathJax) win.MathJax = previousMathJax;
        else delete win.MathJax;
        act(() => setLanguage('sl'));
    }
});

describe('session subscription', () => {
    function captureSessions() {
        const sessions: LessonSession[] = [];
        const original = LessonSession.prototype.start;
        vi.spyOn(LessonSession.prototype, 'start').mockImplementation(function (this: LessonSession) {
            sessions.push(this);
            return original.call(this);
        });
        return sessions;
    }

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('re-renders when the session transitions without any other state change', () => {
        setLanguage('sl');
        const sessions = captureSessions();
        render(<GuidedLesson lesson={lesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        expect(screen.getByRole('heading', {name: 'Prvi korak'})).toBeVisible();

        act(() => sessions[0].next());
        expect(screen.getByRole('heading', {name: 'Drugi korak'})).toBeVisible();
        expect(screen.getByRole('status')).toHaveTextContent('Korak 2 od 2');
    });

    test('creates a new session when the lesson prop changes', () => {
        setLanguage('sl');
        const sessions = captureSessions();
        const caps = capabilities();
        const {rerender} = render(<GuidedLesson lesson={lesson} capabilities={caps} onClose={vi.fn()}/>);
        rerender(<GuidedLesson lesson={framedLesson} capabilities={caps} onClose={vi.fn()}/>);

        expect(sessions).toHaveLength(2);
        expect(sessions[1]).not.toBe(sessions[0]);
        expect(sessions[1].lesson).toBe(framedLesson);
        expect(screen.getByRole('heading', {name: 'Konstrukcija'})).toBeVisible();
        expect(caps.restoreState).toHaveBeenCalled();
    });
});

test('typesets mathematics again when hidden observation instructions reopen', async () => {
    setLanguage('sl');
    const win = window as Window & {MathJax?: {startup: {promise: Promise<unknown>}; typesetClear: Mock; typesetPromise: Mock}};
    const previousMathJax = win.MathJax;
    const typesetPromise = vi.fn((..._args: unknown[]) => Promise.resolve());
    let showInstructions: (() => void) | undefined;
    win.MathJax = {startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise};
    const mathLesson: LessonDefinition = {
        id: 'math-observation-test', demonstrationId: 'bezier', title: {sl: 'Matematika', en: 'Mathematics'}, summary: {sl: 'Povzetek', en: 'Summary'},
        steps: [{id: 'first', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'}, frames: [
            {id: 'explanation', kind: 'explanation', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Uvod', en: 'Introduction'}},
            {id: 'observation', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Pri \\(t=1/2\\) preveri rezultat.', en: 'Check the result at \\(t=1/2\\).'}},
        ]}],
    };

    try {
        render(<GuidedLesson lesson={mathLesson} capabilities={capabilities()} onClose={vi.fn()}
            registerShowInstructions={show => { showInstructions = show; }}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        await waitFor(() => expect(typesetPromise.mock.calls.some(call => (call[0] as unknown as Element[])[0]?.querySelector('.guided-lesson-exploration'))).toBe(true));
        const initialTypesetCount = typesetPromise.mock.calls.length;
        vi.useFakeTimers();
        fireEvent.click(screen.getByRole('button', {name: 'Skrij navodila učne poti'}));
        act(() => vi.advanceTimersByTime(250));
        act(() => showInstructions?.());
        vi.useRealTimers();
        await waitFor(() => expect(typesetPromise.mock.calls.length).toBeGreaterThan(initialTypesetCount));
    } finally {
        vi.useRealTimers();
        if (previousMathJax) win.MathJax = previousMathJax;
        else delete win.MathJax;
        act(() => setLanguage('sl'));
    }
});
