import {useSyncExternalStore} from 'react';
import type {Path} from '../../graphs/base/preview/paths';
import type {PreviewController} from './previewController';
import './ghost.css';

const LIMIT = 1e5;
const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));

/** The polyline as SVG path data, mapped from board coordinates through `box` (`[left, top, right, bottom]`) to a `width` x `height` frame. */
export function pathData(path: Path, box: readonly number[], width: number, height: number): string {
    const [left, top, right, bottom] = box;
    const sx = width / (right - left), sy = height / (top - bottom);
    return path.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${clamp((x - left) * sx).toFixed(1)} ${clamp((top - y) * sy).toFixed(1)}`).join('');
}

/** The ghost of a hovered parameter value: one inert SVG over the board, drawn from copied arrays only. */
export function GhostOverlay({controller, width, height}: {controller: PreviewController; width: number; height: number}) {
    const ghost = useSyncExternalStore(controller.subscribe, controller.getGhost);
    if (!ghost || width <= 0 || height <= 0) return null;
    return <svg className="ghost-overlay" data-ghost-overlay="" aria-hidden="true" width={width} height={height}>
        {ghost.paths.map((path, index) => <path key={index} d={pathData(path, ghost.box, width, height)}/>)}
    </svg>;
}
