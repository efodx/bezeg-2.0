import React, {useMemo} from 'react';
import {buildSide, ElderPath, ElderSettings} from './elderGeometry';
import {elderBounds} from './elderBounds';

/** Clear space around a fitted drawing, in generator units. */
const FIT_PAD = 6;

const paths = (list: ElderPath[]) => list.map((p, i) => <path key={i} fill={p.fill} d={p.d}/>);

/**
 * A still, decorative elder drawing generated in a box of generator units. Nothing sways or grows; the caller's
 * stylesheet places it and mirrors it onto the right edge where needed. With `fit`, the viewBox grows to the whole
 * drawing, so no branch, leaf or head is cut at the generator box; it still starts at x = 0, the entry edge, and
 * the svg carries the drawing's aspect ratio so the stylesheet only sets a width.
 */
export function StillElder({settings, box, className, fit = false}: {settings: ElderSettings; box: {width: number; height: number}; className: string; fit?: boolean}) {
    const branches = useMemo(() => buildSide(settings, 'right', box.width, box.height), [settings, box.width, box.height]);
    const view = useMemo(() => {
        if (!fit) return {x: 0, y: 0, width: box.width, height: box.height};
        const b = elderBounds(branches, FIT_PAD);
        const r = (v: number) => Math.round(v * 10) / 10;
        return {x: 0, y: r(b.y), width: r(b.x + b.width), height: r(b.height)};
    }, [fit, branches, box.width, box.height]);
    return <svg className={className} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} aria-hidden="true" focusable="false"
        style={fit ? {aspectRatio: `${view.width} / ${view.height}`} : undefined}>
        {branches.map((branch, i) => <g key={i}>
            {paths(branch.paths)}
            {branch.heads.map((head, k) => <g key={k}>{paths(head.paths)}{head.subsets.map((subset, n) => <g key={n}>{paths(subset.paths)}</g>)}</g>)}
        </g>)}
    </svg>;
}
