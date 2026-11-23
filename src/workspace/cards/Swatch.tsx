import type {CSSProperties} from 'react';
import type {LegendKind} from '../../graphs/base/declare/graphDeclaration';

/** What the board drew under a declared object id (`BaseGraph.drawnObject`): the only source of a swatch's colour. */
export type DrawnObject = (id: string) => {color: string; visible: boolean} | undefined;

/** A small sample of a legend entry's drawn style, in the colour the board drew it. */
export function Swatch(props: {kind: LegendKind; color: string}) {
    const {kind, color} = props;
    const style: CSSProperties = kind === 'line' ? {borderTop: `2.5px solid ${color}`}
        : kind === 'dashed' ? {borderTop: `2.5px dashed ${color}`}
        : kind === 'area' ? {background: color, opacity: 0.45, borderRadius: 2}
        : kind === 'ring' ? {border: `2px solid ${color}`, borderRadius: '50%'}
        : kind === 'cross' ? {background: `linear-gradient(45deg, transparent 43%, ${color} 43% 57%, transparent 57%), linear-gradient(-45deg, transparent 43%, ${color} 43% 57%, transparent 57%)`}
        : {background: color, borderRadius: '50%'};
    return <span className={`ws-swatch ws-swatch-${kind}`} style={style} data-swatch={kind} data-color={color} aria-hidden="true"/>;
}
