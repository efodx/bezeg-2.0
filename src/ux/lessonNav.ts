/** The guided lesson's position and a way to jump, published for lesson-level prototypes (c10). */
export interface LessonPosition {
    /** A key for the lesson, so captures from another lesson are not mixed in. */
    lessonId: string;
    counts: number[];
    stepIndex: number;
    frameIndex: number;
    complete: boolean;
    /** An observation frame: the student is asked to explore the graph. */
    observing: boolean;
    /** Moves to a frame by stepping Next/Back through the session, so every scene action runs as usual. */
    goTo(stepIndex: number, frameIndex: number): void;
}

let position: LessonPosition | undefined;
const listeners = new Set<(position: LessonPosition | undefined) => void>();

export function publishLessonPosition(next: LessonPosition | undefined): void {
    position = next;
    for (const listener of [...listeners]) listener(position);
}

export function lessonPosition(): LessonPosition | undefined {
    return position;
}

export function onLessonPosition(listener: (position: LessonPosition | undefined) => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function flatIndex(counts: number[], stepIndex: number, frameIndex: number): number {
    return counts.slice(0, stepIndex).reduce((sum, count) => sum + count, 0) + frameIndex;
}

export function fromFlat(counts: number[], flat: number): [number, number] {
    let rest = flat;
    for (let step = 0; step < counts.length; step++) {
        if (rest < counts[step]) return [step, rest];
        rest -= counts[step];
    }
    return [counts.length - 1, counts[counts.length - 1] - 1];
}
