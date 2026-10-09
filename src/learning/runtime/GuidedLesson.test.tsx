import React from 'react';
import {act} from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {setLanguage} from '../../localization';
import type {LessonDefinition, LessonGraphCapabilities} from '../model';
import {GuidedLesson} from './GuidedLesson';

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
    return {captureState: () => ({version: 1, value: 'before'}), restoreState: jest.fn(), apply: jest.fn()};
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

test('offers content-first navigation and preserves step identity when language changes', () => {
    setLanguage('sl');
    const close = jest.fn();
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

test('makes the handoff to graph exploration visible and reversible', () => {
    jest.useFakeTimers();
    setLanguage('sl');
    try {
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={jest.fn()}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        act(() => jest.advanceTimersByTime(250));
        expect(screen.queryByText('Razlaga', {selector: 'p'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Nadaljuj učno pot'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Nadaljuj učno pot'})).toHaveClass('guided-lesson-continue');
        expect(screen.getByText('Učna pot je skrita med raziskovanjem grafa.')).toBeVisible();

        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        expect(document.querySelector('.guided-lesson-handoff-opening')).toBeInTheDocument();
        act(() => jest.advanceTimersByTime(250));
        expect(screen.getByRole('button', {name: 'Nazaj'})).toBeVisible();
        expect(screen.queryByRole('button', {name: 'Preskoči učenje'})).not.toBeInTheDocument();
    } finally {
        jest.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('animates the lesson overlay out before revealing the compact observation prompt', () => {
    jest.useFakeTimers();
    setLanguage('sl');
    try {
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={jest.fn()}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));

        expect(document.querySelector('.guided-lesson-handoff-closing')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Nadaljuj učno pot'})).not.toBeInTheDocument();

        act(() => jest.advanceTimersByTime(250));
        expect(screen.getByRole('button', {name: 'Nadaljuj učno pot'})).toBeVisible();
    } finally {
        jest.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('allows the compact observation prompt to move with keyboard arrows', () => {
    jest.useFakeTimers();
    setLanguage('sl');
    try {
        render(<GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={jest.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        act(() => jest.advanceTimersByTime(250));

        const prompt = document.querySelector('.guided-lesson-hidden-content') as HTMLElement;
        expect(prompt).toHaveAttribute('tabindex', '0');
        fireEvent.keyDown(prompt, {key: 'ArrowRight'});
        expect(prompt.parentElement).toHaveStyle({left: '12px'});
    } finally {
        jest.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('keeps the compact observation prompt inside the coordinate system rectangle', () => {
    jest.useFakeTimers();
    setLanguage('sl');
    try {
        render(<div className="demonstration-workspace"><div id="jgbox"/><GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={jest.fn()}/></div>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        act(() => jest.advanceTimersByTime(250));

        const prompt = document.querySelector('.guided-lesson-hidden-content') as HTMLElement;
        const lessonElement = prompt.parentElement as HTMLElement;
        const graphElement = document.querySelector('#jgbox') as HTMLElement;
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
        jest.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('allows a pointer drag to move the compact observation prompt toward the right edge', () => {
    jest.useFakeTimers();
    setLanguage('sl');
    try {
        render(<div className="demonstration-workspace"><div id="jgbox"/><GuidedLesson lesson={denseLesson} capabilities={capabilities()} onClose={jest.fn()}/></div>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        act(() => jest.advanceTimersByTime(250));

        const prompt = document.querySelector('.guided-lesson-hidden-content') as HTMLElement;
        const lessonElement = prompt.parentElement as HTMLElement;
        const graphElement = document.querySelector('#jgbox') as HTMLElement;
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
        Object.defineProperty(prompt, 'setPointerCapture', {configurable: true, value: jest.fn()});
        Object.defineProperty(prompt, 'hasPointerCapture', {configurable: true, value: () => true});
        Object.defineProperty(prompt, 'releasePointerCapture', {configurable: true, value: jest.fn()});

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
        jest.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('renders explicit observation animation controls after the explanation frame', () => {
    jest.useFakeTimers();
    setLanguage('sl');
    try {
        const apply = jest.fn();
        render(<GuidedLesson lesson={framedLesson} capabilities={{...capabilities(), apply}} onClose={jest.fn()}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        act(() => jest.advanceTimersByTime(250));
        expect(screen.getByRole('button', {name: 'Nadaljuj učno pot'})).toBeVisible();
        fireEvent.click(screen.getByRole('button', {name: 'Nadaljuj učno pot'}));
        act(() => jest.advanceTimersByTime(250));
        expect(screen.getByText('Opazovanje', {selector: 'strong'})).toBeVisible();
        expect(screen.getByRole('button', {name: /Predvajaj/})).toBeVisible();
        fireEvent.click(screen.getByRole('button', {name: /Ponovi/}));
        expect(apply).toHaveBeenCalledWith({kind: 'animation', animationId: 'decasteljau', command: 'replay'});
    } finally {
        jest.useRealTimers();
        act(() => setLanguage('sl'));
    }
});

test('applies an action declared by the current frame', () => {
    setLanguage('sl');
    const apply = jest.fn();
    render(<GuidedLesson lesson={frameActionLesson} capabilities={{...capabilities(), apply}} onClose={jest.fn()}/>);

    fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
    fireEvent.click(screen.getByRole('button', {name: 'Pokaži poligon'}));
    expect(apply).toHaveBeenCalledWith({kind: 'curve-visibility', target: 'control-polygon', visible: true});
});

test('uses Next as the only forward lesson command', () => {
    setLanguage('sl');
    render(<GuidedLesson lesson={framedLesson} capabilities={capabilities()} onClose={jest.fn()}/>);

    expect(screen.queryByRole('button', {name: 'Razišči v grafu'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Naprej'})).toBeVisible();
    act(() => setLanguage('sl'));
});

test('skips MathJax work for a frame without mathematics', async () => {
    setLanguage('sl');
    const win = window as Window & {MathJax?: {startup: {promise: Promise<unknown>}; typesetClear: jest.Mock; typesetPromise: jest.Mock}};
    const previousMathJax = win.MathJax;
    const typesetPromise = jest.fn((..._args: unknown[]) => Promise.resolve());
    win.MathJax = {startup: {promise: Promise.resolve()}, typesetClear: jest.fn(), typesetPromise};

    try {
        render(<GuidedLesson lesson={framedLesson} capabilities={capabilities()} onClose={jest.fn()}/>);
        await act(async () => { await Promise.resolve(); });
        expect(typesetPromise).not.toHaveBeenCalled();
    } finally {
        if (previousMathJax) win.MathJax = previousMathJax;
        else delete win.MathJax;
        act(() => setLanguage('sl'));
    }
});

test('typesets mathematics after the observation prompt collapses the overlay', async () => {
    setLanguage('sl');
    const win = window as Window & {MathJax?: {startup: {promise: Promise<unknown>}; typesetClear: jest.Mock; typesetPromise: jest.Mock}};
    const previousMathJax = win.MathJax;
    const typesetPromise = jest.fn((..._args: unknown[]) => Promise.resolve());
    win.MathJax = {startup: {promise: Promise.resolve()}, typesetClear: jest.fn(), typesetPromise};
    const mathLesson: LessonDefinition = {
        id: 'math-observation-test', demonstrationId: 'bezier', title: {sl: 'Matematika', en: 'Mathematics'}, summary: {sl: 'Povzetek', en: 'Summary'},
        steps: [{id: 'first', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'}, frames: [
            {id: 'explanation', kind: 'explanation', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Uvod', en: 'Introduction'}},
            {id: 'observation', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Pri \\(t=1/2\\) preveri rezultat.', en: 'Check the result at \\(t=1/2\\).'}},
        ]}],
    };

    try {
        render(<GuidedLesson lesson={mathLesson} capabilities={capabilities()} onClose={jest.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Naprej'}));
        await waitFor(() => expect(typesetPromise.mock.calls.some(call => (call[0] as unknown as Element[])[0]?.querySelector('.guided-lesson-hidden-content'))).toBe(true));
    } finally {
        if (previousMathJax) win.MathJax = previousMathJax;
        else delete win.MathJax;
        act(() => setLanguage('sl'));
    }
});
