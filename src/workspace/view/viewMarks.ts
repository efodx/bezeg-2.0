// Maps the declared marks (graphDeclaration.ts `ViewMarks`) to the world points the fit takes the hull of. Pure.
import type {ViewMark, ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import type {Point} from './viewFit';

export function markPoints(mark: ViewMark): Point[] {
    switch (mark.kind) {
        case 'point':
            return [[mark.x, mark.y]];
        case 'box':
            return [[mark.left, mark.top], [mark.right, mark.top], [mark.right, mark.bottom], [mark.left, mark.bottom]];
        case 'polyline':
            return mark.points.map(p => [p[0], p[1]] as Point);
    }
}

export function marksToPoints(marks: ViewMarks): {must: Point[]; nice: Point[]} {
    return {
        must: marks.must.flatMap(markPoints),
        nice: (marks.nice ?? []).flatMap(markPoints),
    };
}
