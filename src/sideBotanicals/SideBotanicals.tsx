import React, {useEffect, useMemo, useState} from 'react';
import {buildSide, ELDER_SETTINGS, HEAD_AMP_FACTOR, ElderSide, ElderSettings} from './elderGeometry';
import './SideBotanicals.css';

const MIN_WIDTH = 1600;
const BOX_H = 1440;

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

interface Viewport {gutter: number; height: number}
const HIDDEN: Viewport = {gutter: 0, height: 0};

function measure(column: number): Viewport {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || !window.matchMedia(`(min-width: ${MIN_WIDTH}px)`).matches) return HIDDEN;
    const gutter = Math.max(0, (window.innerWidth - column) / 2 - 24);
    return gutter < 100 ? HIDDEN : {gutter: Math.round(gutter), height: Math.round(window.innerHeight)};
}

function useViewport(column: number): Viewport {
    const [viewport, setViewport] = useState<Viewport>(() => measure(column));
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const next = measure(column);
            setViewport((prev) => prev.gutter === next.gutter && prev.height === next.height ? prev : next);
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        window.addEventListener('resize', schedule);
        update();
        return () => {
            window.removeEventListener('resize', schedule);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [column]);
    return viewport;
}

/** `column` is the width of the page content column the branches must stay clear of. */
export function SideBotanicals({settings = ELDER_SETTINGS, column = 1100}: {settings?: ElderSettings; column?: number}) {
    const {gutter, height} = useViewport(column);
    const sides = useMemo(() => {
        if (!gutter) return null;
        const boxW = gutter * BOX_H / height;
        const fitted = fitToGutter(settings, boxW);
        return (['left', 'right'] as ElderSide[]).map((side) => ({side, branches: buildSide(fitted, side, boxW, BOX_H), boxW}));
    }, [gutter, height, settings]);
    if (!sides) return null;
    const mask = `linear-gradient(to right,#000 40%,rgb(0 0 0 / ${1 - settings.fade}) 100%)`;
    return <>
        {sides.map(({side, branches, boxW}) => <svg key={side} className={`side-botanicals side-botanicals-${side}`}
            viewBox={`0 0 ${Math.round(boxW * 10) / 10} ${BOX_H}`} aria-hidden="true" focusable="false"
            style={{width: `${gutter}px`, opacity: settings.opacity, WebkitMaskImage: mask, maskImage: mask, '--amp': `${settings.amp}deg`, '--head-amp': `${Math.round(settings.amp * HEAD_AMP_FACTOR * 10) / 10}deg`} as React.CSSProperties}>
            {branches.map((b, i) => <g key={i} className="side-botanicals-branch"
                style={{transformOrigin: `0px ${b.hingeY}px`, '--dur': `${b.duration}s`, '--delay': `${b.delay}s`} as React.CSSProperties}>
                {b.paths.map((p, j) => <path key={j} fill={p.fill} d={p.d}/>)}
                {b.heads.map((h, k) => <g key={k} className="side-botanicals-head"
                    style={{transformOrigin: `${h.baseX}px ${h.baseY}px`, '--dur': `${h.duration}s`, '--delay': `${h.delay}s`} as React.CSSProperties}>
                    {h.paths.map((p, j) => <path key={j} fill={p.fill} d={p.d}/>)}
                    {h.subsets.map((s, n) => <g key={n} className="side-botanicals-florets"
                        style={{'--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--turn': `${s.turn}deg`, '--dur': `${s.duration}s`, '--delay': `${s.delay}s`} as React.CSSProperties}>
                        {s.paths.map((p, j) => <path key={j} fill={p.fill} d={p.d}/>)}
                    </g>)}
                </g>)}
            </g>)}
        </svg>)}
    </>;
}

const TARGET_PATHS = ['/bezeg-2.0', '/bezeg-2.0/demonstrations', '/bezeg-2.0/learn'];

/** Only the home, demonstrations and learn landing pages carry the decoration. */
export function showsSideBotanicals(pathname: string): boolean {
    return TARGET_PATHS.includes(pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);
}
