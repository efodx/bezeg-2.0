import React, {useLayoutEffect, useRef} from 'react';

/**
 * The step counter "Step k of N", placed inside the playback group and linked to the group's Next step button with aria-describedby, so
 * the button states its range. The shared PlaybackButtons has no description slot, so the link is made on the button after each render
 * (the button's own description, when it is blocked, is kept in the list).
 */
export function StepCounter({id, children}: { readonly id: string; readonly children: React.ReactNode }) {
    const counter = useRef<HTMLParagraphElement>(null);
    useLayoutEffect(() => {
        const next = counter.current?.closest('[role="group"]')?.querySelector<HTMLElement>('[data-action="next-step"]');
        if (!next) return;
        const ids = (next.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(item => item && item !== id);
        next.setAttribute('aria-describedby', [...ids, id].join(' '));
    });
    return <p id={id} ref={counter} data-step-counter="">{children}</p>;
}
