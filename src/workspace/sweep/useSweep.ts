// What a number puck needs of sweeping: whether to offer it, whether it runs, and how to toggle it.
import {useCallback, useEffect, useSyncExternalStore} from 'react';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import {sweepsFor, type SweepParameter} from './sweeps';

const REDUCED = '(prefers-reduced-motion: reduce)';

/** Whether the learner asks for reduced motion; no sweep is offered then (a feel-slice decision, task 06). */
export function usePrefersReducedMotion(): boolean {
    const subscribe = useCallback((listener: () => void) => {
        const query = window.matchMedia?.(REDUCED);
        query?.addEventListener?.('change', listener);
        return () => query?.removeEventListener?.('change', listener);
    }, []);
    return useSyncExternalStore(subscribe, () => window.matchMedia?.(REDUCED).matches === true, () => false);
}

export interface PuckSweep {
    readonly running: boolean;
    toggle(): void;
}

const noSubscribe = () => () => undefined;

/** The sweep control of `parameter`, or undefined when none is offered (reduced motion, a locked parameter, a graph without an arbiter). */
export function useSweep(graph: BaseGraph<BaseGraphState>, parameter: SweepParameter): PuckSweep | undefined {
    const arbiter = graph.parameters;
    const sweeps = arbiter && typeof arbiter.lease === 'function' ? sweepsFor(arbiter) : undefined;
    const key = parameter.key;
    const running = useSyncExternalStore(sweeps?.subscribe ?? noSubscribe, () => sweeps?.isRunning(key) ?? false);
    const reduced = usePrefersReducedMotion();
    const locked = parameter.locked === true;
    // A learner who asks for reduced motion, or a step that locks the parameter, stops a sweep already running.
    useEffect(() => { if ((reduced || locked) && sweeps) sweeps.stop(key); }, [reduced, locked, sweeps, key]);
    if (!sweeps || reduced || locked) return undefined;
    return {running, toggle: () => sweeps.toggle(parameter)};
}
