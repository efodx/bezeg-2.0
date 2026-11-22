import {useEffect, useRef} from 'react';
import {recentlyProbed, useParams} from '../a1/paramRegistry';
import {usePick} from '../picks';
import {director} from './viewDirector';
import {autoFitOn, getViewPort, setFitHandler, setNavHandler, subscribeAutoFit, subscribeViewPort} from './viewPort';

/**
 * The triggers of the view director (viewDirector.ts) for every graph with a view port while pick `viewDirector` is on: load,
 * the graph's own view, a lesson frame's actions, canvas resize, a card dropped, folded or opened, the end of a press (a parameter
 * released), the switch and "Prilagodi točkam". Learner pan or zoom on the board pauses the director (until the button or a new
 * frame). It computes nothing: every trigger is `director.request(reason)`.
 */
export function useViewDirector() {
    const on = usePick('viewDirector');
    const params = useParams();

    useEffect(() => {
        if (!on) return undefined;
        let boardOff: (() => void) | undefined, containerOff: (() => void) | undefined, observeOff: (() => void) | undefined;
        let boardDown = false, wheelUntil = 0;
        const bind = () => {
            boardOff?.(); containerOff?.(); observeOff?.();
            boardOff = containerOff = observeOff = undefined;
            const port = getViewPort();
            if (!port) return;
            const onBox = () => { if (!director.state().morphing && (boardDown || performance.now() < wheelUntil)) director.pause(); };
            port.board.on('boundingbox', onBox);
            boardOff = () => port.board.off('boundingbox', onBox);
            const onDown = (e: Event) => { if (!(e.target as Element | null)?.closest('.ux-dock')) boardDown = true; };
            const onWheel = () => { wheelUntil = performance.now() + 500; };
            port.container.addEventListener('pointerdown', onDown, true);
            port.container.addEventListener('wheel', onWheel, {passive: true, capture: true});
            containerOff = () => { port.container.removeEventListener('pointerdown', onDown, true); port.container.removeEventListener('wheel', onWheel, true); };
            const ro = new ResizeObserver(() => director.request('resize'));
            ro.observe(port.container);
            const dock = port.container.closest('.workspace-graph')?.querySelector('.ux-dock');
            const mo = new MutationObserver(() => director.request('dock'));
            if (dock) mo.observe(dock, {attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true});
            observeOff = () => { ro.disconnect(); mo.disconnect(); };
        };
        const onDown = () => director.press(true);
        const onUp = () => { boardDown = false; director.press(false); };
        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
        const off = subscribeViewPort(kind => {
            if (kind === 'port') { director.reset(); bind(); director.request('port'); return; }
            director.request(kind === 'action' ? 'action' : 'intent');
        });
        bind();
        setNavHandler(() => director.pause());
        setFitHandler(() => director.fitNow());
        const autoOff = subscribeAutoFit(() => { if (autoFitOn()) director.request('auto'); else director.stop(); });
        director.request('port');
        return () => {
            off(); autoOff(); boardOff?.(); containerOff?.(); observeOff?.();
            window.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointerup', onUp, true);
            window.removeEventListener('pointercancel', onUp, true);
            director.stop(); setNavHandler(undefined); setFitHandler(undefined);
        };
    }, [on]);

    // A parameter changed (a release, keys, typed, a lesson): refit only when a must point is covered. No timer: a press holds it back.
    const first = useRef(true);
    useEffect(() => {
        if (!on) return;
        if (first.current) { first.current = false; return; }
        if (!recentlyProbed()) director.paramsChanged();
    }, [on, params]);
}
