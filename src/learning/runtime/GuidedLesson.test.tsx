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
    expect(screen.getByRole('button', {name: 'Končaj učno pot'})).toHaveClass('guided-lesson-close');
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

test('shows the observation in the full overlay first and collapses it only on request', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        act(() => vi.advanceTimersByTime(250));

        expect(document.querySelector('.guided-lesson-hidden-content')).not.toBeInTheDocument();
        expect(document.querySelector('.guided-lesson-content')).toBeInTheDocument();
        expect(screen.getByText('Opazuj', {selector: 'p'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Nazaj'})).toBeVisible();
        expect(screen.queryByRole('button', {name: 'Nadaljuj učno pot'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Opazuj na grafu'}));
        expect(document.querySelector('.guided-lesson-handoff-closing')).toBeInTheDocument();
        act(() => vi.advanceTimersByTime(250));
        expect(screen.getByRole('button', {name: 'Nadaljuj učno pot'})).toHaveClass('guided-lesson-continue');
        expect(screen.getByText('Učna pot je skrita med raziskovanjem grafa.')).toBeVisible();

        fireEvent.click(screen.getByRole('button', {name: 'Nazaj na navodila'}));
        act(() => vi.advanceTimersByTime(250));
        expect(screen.getByRole('button', {name: 'Opazuj na grafu'})).toBeVisible();
        expect(screen.getByText('Opazuj', {selector: 'p'})).toBeVisible();
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('reports the graph as locked in the observation overlay and unlocked in the compact prompt', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const onModeChange = vi.fn();
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={vi.fn()} onModeChange={onModeChange}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        expect(onModeChange).toHaveBeenLastCalledWith('content');
        observe();
        expect(onModeChange).toHaveBeenLastCalledWith('explore');
        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        act(() => vi.advanceTimersByTime(250));
        expect(onModeChange).toHaveBeenLastCalledWith('complete');
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('Continue advances to the next frame and opens its overlay', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        render(<GuidedLesson lesson={observationFirstLesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        expect(screen.getByRole('button', {name: 'Opazuj na grafu'})).toBeVisible();
        observe();
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
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        observe();
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

test('allows the compact observation prompt to move with keyboard arrows', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        observe();

        const prompt = document.querySelector('.guided-lesson-hidden-content') as HTMLElement;
        expect(prompt).toHaveAttribute('tabindex', '0');
        fireEvent.keyDown(prompt, {key: 'ArrowRight'});
        expect(prompt.parentElement).toHaveStyle({left: '12px'});
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('keeps the compact observation prompt inside the coordinate system rectangle', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const graphRef = React.createRef<HTMLDivElement>();
        render(<div className="demonstration-workspace"><div ref={graphRef}/><GuidedLesson lesson={denseLesson} capabilities={capabilities()} graphContainer={graphRef} onClose={vi.fn()}/></div>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        observe();

        const prompt = document.querySelector('.guided-lesson-hidden-content') as HTMLElement;
        const lessonElement = prompt.parentElement as HTMLElement;
        const graphElement = graphRef.current as HTMLElement;
        Object.defineProperty(graphElement, 'getBoundingClientRect', {configurable: true, value: () => ({left: 100, top: 100, right: 500, bottom: 400, width: 400, height: 300})});
        Object.defineProperty(lessonElement, 'getBoundingClientRect', {
            configurable: true,
            value: () => {
                const left = 200 + Number.parseFloat(lessonElement.style.left || '0');
                const top = 150 + Number.parseFloat(lessonElement.style.top || '0');
                return {left, top, right: left + 400, bottom: top + 100, width: 400, height: 100};
            },
        });
        Object.defineProperty(prompt, 'getBoundingClientRect', {
            configurable: true,
            value: () => {
                const left = 200 + Number.parseFloat(lessonElement.style.left || '0');
                const top = 150 + Number.parseFloat(lessonElement.style.top || '0');
                return {left, top, right: left + 200, bottom: top + 100, width: 200, height: 100};
            },
        });

        for (let index = 0; index < 20; index += 1) fireEvent.keyDown(prompt, {key: 'ArrowLeft'});
        expect(lessonElement).toHaveStyle({left: '-92px'});
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('allows a pointer drag to move the compact observation prompt toward the right edge', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const graphRef = React.createRef<HTMLDivElement>();
        render(<div className="demonstration-workspace"><div ref={graphRef}/><GuidedLesson lesson={denseLesson} capabilities={capabilities()} graphContainer={graphRef} onClose={vi.fn()}/></div>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        observe();

        const prompt = document.querySelector('.guided-lesson-hidden-content') as HTMLElement;
        const lessonElement = prompt.parentElement as HTMLElement;
        const graphElement = graphRef.current as HTMLElement;
        Object.defineProperty(graphElement, 'getBoundingClientRect', {configurable: true, value: () => ({left: 100, top: 100, right: 500, bottom: 400, width: 400, height: 300})});
        Object.defineProperty(lessonElement, 'getBoundingClientRect', {
            configurable: true,
            value: () => {
                const left = 200 + Number.parseFloat(lessonElement.style.left || '0');
                const top = 150 + Number.parseFloat(lessonElement.style.top || '0');
                return {left, top, right: left + 400, bottom: top + 100, width: 400, height: 100};
            },
        });
        Object.defineProperty(prompt, 'getBoundingClientRect', {
            configurable: true,
            value: () => {
                const left = 200 + Number.parseFloat(lessonElement.style.left || '0');
                const top = 150 + Number.parseFloat(lessonElement.style.top || '0');
                return {left, top, right: left + 200, bottom: top + 100, width: 200, height: 100};
            },
        });
        Object.defineProperty(prompt, 'setPointerCapture', {configurable: true, value: vi.fn()});
        Object.defineProperty(prompt, 'hasPointerCapture', {configurable: true, value: () => true});
        Object.defineProperty(prompt, 'releasePointerCapture', {configurable: true, value: vi.fn()});

        const dispatchPointer = (type: string, values: Record<string, unknown>) => {
            const event = new Event(type, {bubbles: true});
            Object.entries(values).forEach(([key, value]) => Object.defineProperty(event, key, {configurable: true, value}));
            prompt.dispatchEvent(event);
        };
        act(() => {
            dispatchPointer('pointerdown', {pointerId: 1, pointerType: 'mouse', button: 0, clientX: 300, clientY: 200});
            dispatchPointer('pointermove', {pointerId: 1, clientX: 450, clientY: 200});
            dispatchPointer('pointerup', {pointerId: 1});
        });
        expect(lessonElement).toHaveStyle({left: '92px'});
    } finally {
        vi.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('offers observation playback only beside the visible graph and pauses it when the lesson returns', () => {
    vi.useFakeTimers();
    setLanguage('sl');
    try {
        const apply = vi.fn();
        render(<GuidedLesson lesson={framedLesson} capabilities={{...capabilities(), apply}} onClose={vi.fn()}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        observe();
        const controls = screen.getByRole('group', {name: 'Kontrole animacije konstrukcije'});
        expect(controls.closest('.guided-lesson-hidden-content')).not.toBeNull();
        expect(controls.querySelectorAll('svg.guided-lesson-animation-icon')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', {name: /Predvajaj/}));
        expect(apply).toHaveBeenLastCalledWith({kind: 'animation', animationId: 'decasteljau', command: 'play'});

        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        expect(apply).toHaveBeenLastCalledWith({kind: 'animation', animationId: 'decasteljau', command: 'pause'});
        act(() => vi.advanceTimersByTime(250));
        expect(document.querySelector('.guided-lesson-complete')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /Predvajaj/})).not.toBeInTheDocument();
        expect(screen.queryByRole('group', {name: 'Kontrole animacije konstrukcije'})).not.toBeInTheDocument();
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
        observe();
        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
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

test('typesets mathematics in the observation overlay and after the prompt collapses the overlay', async () => {
    setLanguage('sl');
    const win = window as Window & {MathJax?: {startup: {promise: Promise<unknown>}; typesetClear: Mock; typesetPromise: Mock}};
    const previousMathJax = win.MathJax;
    const typesetPromise = vi.fn((..._args: unknown[]) => Promise.resolve());
    win.MathJax = {startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise};
    const mathLesson: LessonDefinition = {
        id: 'math-observation-test', demonstrationId: 'bezier', title: {sl: 'Matematika', en: 'Mathematics'}, summary: {sl: 'Povzetek', en: 'Summary'},
        steps: [{id: 'first', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'}, frames: [
            {id: 'explanation', kind: 'explanation', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Uvod', en: 'Introduction'}},
            {id: 'observation', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Pri \\(t=1/2\\) preveri rezultat.', en: 'Check the result at \\(t=1/2\\).'}},
        ]}],
    };

    try {
        render(<GuidedLesson lesson={mathLesson} capabilities={capabilities()} onClose={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        await waitFor(() => expect(typesetPromise.mock.calls.some(call => (call[0] as unknown as Element[])[0]?.querySelector('.guided-lesson-exploration'))).toBe(true));
        fireEvent.click(screen.getByRole('button', {name: 'Opazuj na grafu'}));
        await waitFor(() => expect(typesetPromise.mock.calls.some(call => (call[0] as unknown as Element[])[0]?.querySelector('.guided-lesson-hidden-content'))).toBe(true));
    } finally {
        if (previousMathJax) win.MathJax = previousMathJax;
        else delete win.MathJax;
        act(() => setLanguage('sl'));
    }
});
