import React from 'react';

/** Authored icons for the picks' board controls: one 1.5px stroke, round caps, currentColor. */
const base = {viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false} as const;

export const MinusIcon = () => <svg {...base}><path d="M4 8h8"/></svg>;
export const PlusIcon = () => <svg {...base}><path d="M4 8h8M8 4v8"/></svg>;
/** Six small rings in two columns: the handle of a movable card. */
export const GripIcon = () => <svg {...base}>{[4, 8, 12].flatMap(y => [5.5, 10.5].map(x => <circle key={`${x}${y}`} cx={x} cy={y} r={0.9}/>))}</svg>;
/** A sine stroke: let the parameter move on its own. */
export const WaveIcon = () => <svg {...base}><path d="M1.5 8c1.8-5 3.5-5 5 0s3.2 5 5 0 1.6-3.4 2.5-3"/></svg>;
export const PauseIcon = () => <svg {...base}><path d="M5.5 3.5v9M10.5 3.5v9"/></svg>;
export const ChevronDownIcon = () => <svg {...base}><path d="M4 6.5 8 10.5 12 6.5"/></svg>;
/** Two arrows away from each other: the stack scrolls. */
export const ScrollIcon = () => <svg {...base}><path d="M5.5 6 8 3.5 10.5 6M5.5 10 8 12.5 10.5 10"/></svg>;
