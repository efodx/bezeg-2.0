import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {buildSide, ELDER_SETTINGS, HEAD_AMP_FACTOR, ElderSide, ElderSettings} from './elderGeometry';
import {startGrowth} from './growth';
import {COLUMN_SELECTOR, columnEdges, Gutters, gutterWidths} from './gutters';
import './SideBotanicals.css';

const MIN_WIDTH = 1600;
const BOX_H = 1440;

/**
 * Growth at which a part attached at the limb tip starts to appear. The stylesheet fades each part in over the
 * next 0.125 of growth, so everything is complete just before growth reaches 1.
 */
const GROW_SPAN = .85;
const growAt = (at: number): string => `${Math.round(at * GROW_SPAN * 1000) / 1000}`;

/** Owner (2026-11-13): the density seen at a 2048px-wide window looks best on every size: three branches per side with four heads each. */
const BRANCHES = 3;
const HEADS = 4;

/** Gutter width in box units at a 2048px-wide window, where the owner liked the look best. */
const DENSITY_BOX_W = 516;
const DENSITY_SIZE = .4;

/**
 * Keeps the same density on every gutter: fixed branch and head counts. Plant size is exactly the 2048px look
 * there and grows only with the square root of the gutter width, so ultrawides are not dominated by huge plants.
 */
export function fitToGutter(settings: ElderSettings, boxW: number): ElderSettings {
    const k = DENSITY_SIZE * Math.sqrt(boxW / DENSITY_BOX_W);
    return {...settings, size: settings.size * k, thick: settings.thick * Math.sqrt(k),
        left: Math.min(BRANCHES, settings.left), right: Math.min(BRANCHES, settings.right), heads: Math.min(HEADS, settings.heads)};
}

interface Viewport extends Gutters {height: number}
const HIDDEN: Viewport = {left: 0, right: 0, height: 0};

function measure(column: Element | null): Viewport {
    if (!column || typeof window.matchMedia !== 'function' || !window.matchMedia(`(min-width: ${MIN_WIDTH}px)`).matches) return HIDDEN;
    // The fixed layers span the viewport without the scrollbar, so the right gutter is measured from that edge.
    const {left, right} = gutterWidths(columnEdges(column), document.documentElement.clientWidth || window.innerWidth);
    return left || right ? {left, right, height: Math.round(window.innerHeight)} : HIDDEN;
}

/** Gutters beside the content column of the page at `route`, kept current while the window or the column resizes. */
function useViewport(route: string): Viewport {
    const [viewport, setViewport] = useState<Viewport>(HIDDEN);
    // A layout effect: the page root is in the document by now, and the first paint already has the branches.
    useLayoutEffect(() => {
        let frame = 0;
        let column: Element | null = null;
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        const columnResize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
        // Only while the column is missing, for example while a page is still loading.
        const columnArrival = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
            if (document.querySelector(COLUMN_SELECTOR)) schedule();
        });
        function update() {
            frame = 0;
            if (!column?.isConnected) {
                columnResize?.disconnect();
                column = document.querySelector(COLUMN_SELECTOR);
                if (column) {
                    columnArrival?.disconnect();
                    columnResize?.observe(column); // Content box, so a change of the column's padding counts too.
                } else columnArrival?.observe(document.body, {childList: true, subtree: true});
            }
            const next = measure(column);
            setViewport((prev) => prev.left === next.left && prev.right === next.right && prev.height === next.height ? prev : next);
        }
        window.addEventListener('resize', schedule);
        update();
        return () => {
            window.removeEventListener('resize', schedule);
            columnResize?.disconnect();
            columnArrival?.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [route]);
    return viewport;
}

/** `route` is the current pathname; the page there marks its content column with `data-content-column`. */
export function SideBotanicals({settings = ELDER_SETTINGS, route}: {settings?: ElderSettings; route: string}) {
    const {left, right, height} = useViewport(route);
    const sides = useMemo(() => {
        const gutters = ([['left', left], ['right', right]] as [ElderSide, number][]).filter(([, gutter]) => gutter > 0);
        if (!gutters.length) return null;
        return gutters.map(([side, gutter]) => {
            const boxW = gutter * BOX_H / height;
            return {side, gutter, boxW, branches: buildSide(fitToGutter(settings, boxW), side, boxW, BOX_H)};
        });
    }, [left, right, height, settings]);
    const root = useRef<HTMLDivElement>(null);
    const shown = sides !== null;
    // Before the first paint, so reduced motion and a growth already reached in this visit never flash a smaller state.
    useLayoutEffect(() => {
        const element = root.current;
        if (!shown || !element) return;
        return startGrowth((growth) => element.style.setProperty('--growth', `${Math.round(growth * 1000) / 1000}`));
    }, [shown]);
    if (!sides) return null;
    const mask = `linear-gradient(to right,#000 40%,rgb(0 0 0 / ${1 - settings.fade}) 100%)`;
    return <div ref={root} className="side-botanicals-root">
        {sides.map(({side, gutter, branches, boxW}) => <svg key={side} className={`side-botanicals side-botanicals-${side}`}
            viewBox={`0 0 ${Math.round(boxW * 10) / 10} ${BOX_H}`} aria-hidden="true" focusable="false"
            style={{width: `${gutter}px`, '--opacity': settings.opacity, WebkitMaskImage: mask, maskImage: mask, '--amp': `${settings.amp}deg`, '--head-amp': `${Math.round(settings.amp * HEAD_AMP_FACTOR * 10) / 10}deg`} as React.CSSProperties}>
            {branches.map((b, i) => <g key={i} className="side-botanicals-branch"
                style={{transformOrigin: `0px ${b.hingeY}px`, '--dur': `${b.duration}s`, '--delay': `${b.delay}s`} as React.CSSProperties}>
                {b.paths.map((p, j) => p.at > 0
                    ? <path key={j} className="side-botanicals-grow" fill={p.fill} d={p.d}
                        style={{transformOrigin: `${p.baseX}px ${p.baseY}px`, '--at': growAt(p.at)} as React.CSSProperties}/>
                    : <path key={j} fill={p.fill} d={p.d}/>)}
                {b.heads.map((h, k) => <g key={k} className="side-botanicals-head side-botanicals-grow"
                    style={{'--at': growAt(h.at), transformOrigin: `${h.baseX}px ${h.baseY}px`, '--dur': `${h.duration}s`, '--delay': `${h.delay}s`} as React.CSSProperties}>
                    {h.paths.map((p, j) => <path key={j} fill={p.fill} d={p.d}/>)}
                    {h.subsets.map((s, n) => <g key={n} className="side-botanicals-florets"
                        style={{'--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--turn': `${s.turn}deg`, '--dur': `${s.duration}s`, '--delay': `${s.delay}s`} as React.CSSProperties}>
                        {s.paths.map((p, j) => <path key={j} fill={p.fill} d={p.d}/>)}
                    </g>)}
                </g>)}
            </g>)}
        </svg>)}
    </div>;
}

const TARGET_PATHS = ['/bezeg-2.0', '/bezeg-2.0/demonstrations', '/bezeg-2.0/learn'];

const CHAPTER_PATH = /^\/bezeg-2\.0\/learn\/[^/]+$/;

/** The home, demonstrations and learn landing pages and the chapter reading pages (`/learn/<chapter>`) carry the decoration. */
export function showsSideBotanicals(pathname: string): boolean {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    return TARGET_PATHS.includes(path) || CHAPTER_PATH.test(path);
}
