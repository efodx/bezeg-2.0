import {useLayoutEffect, useRef} from 'react';

/** The body of the lesson card (task 04 slice 3b): it only holds the workspace's persistent lesson slot. `GuidedLesson` is portalled
 *  into that slot, so moving the slot here, or out again when the card is re-created, never remounts the lesson. */
export function LessonCardBody({slot}: {slot: HTMLElement | null}) {
    const holder = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = holder.current;
        if (!element || !slot) return undefined;
        element.append(slot);
        return () => { if (slot.parentElement === element) slot.remove(); };
    }, [slot]);
    return <div ref={holder} className="lesson-card-body"/>;
}
