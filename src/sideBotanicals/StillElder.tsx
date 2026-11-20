import React, {useMemo} from 'react';
import {buildSide, ElderPath, ElderSettings} from './elderGeometry';

const paths = (list: ElderPath[]) => list.map((p, i) => <path key={i} fill={p.fill} d={p.d}/>);

/**
 * A still, decorative elder drawing in a fixed box of generator units. Nothing sways or grows; the caller's
 * stylesheet places it and mirrors it onto the right edge where needed.
 */
export function StillElder({settings, box, className}: {settings: ElderSettings; box: {width: number; height: number}; className: string}) {
    const branches = useMemo(() => buildSide(settings, 'right', box.width, box.height), [settings, box.width, box.height]);
    return <svg className={className} viewBox={`0 0 ${box.width} ${box.height}`} aria-hidden="true" focusable="false">
        {branches.map((branch, i) => <g key={i}>
            {paths(branch.paths)}
            {branch.heads.map((head, k) => <g key={k}>{paths(head.paths)}{head.subsets.map((subset, n) => <g key={n}>{paths(subset.paths)}</g>)}</g>)}
        </g>)}
    </svg>;
}
