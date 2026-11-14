import React, {useMemo} from 'react';
import {buildSide, ELDER_SETTINGS, ElderPath, ElderSettings} from '../../sideBotanicals/elderGeometry';

/** Box of the branch in generator units: wide and low, for the band above the heading actions. */
export const WORKSPACE_ELDER_BOX = {width: 640, height: 150};

/** One short branch of the elder that Home grows in its gutters, at a size that fits that band. */
const SETTINGS: ElderSettings = {...ELDER_SETTINGS, left: 1, right: 1, top: 12, bottom: 30, reach: 82, size: .5, thick: 1.4, heads: 2, leaves: 3};

const paths = (list: ElderPath[]) => list.map((p, i) => <path key={i} fill={p.fill} d={p.d}/>);

/**
 * The workspace's one botanical detail. Static and decorative: nothing sways or grows beside the graph
 * (docs/specs/side-botanicals.md, decision 2). The stylesheet mirrors it onto the right edge.
 */
export function WorkspaceElder() {
    const branches = useMemo(() => buildSide(SETTINGS, 'right', WORKSPACE_ELDER_BOX.width, WORKSPACE_ELDER_BOX.height), []);
    return <svg className="workspace-elder" viewBox={`0 0 ${WORKSPACE_ELDER_BOX.width} ${WORKSPACE_ELDER_BOX.height}`} aria-hidden="true" focusable="false">
        {branches.map((branch, i) => <g key={i}>
            {paths(branch.paths)}
            {branch.heads.map((head, k) => <g key={k}>{paths(head.paths)}{head.subsets.map((subset, n) => <g key={n}>{paths(subset.paths)}</g>)}</g>)}
        </g>)}
    </svg>;
}
