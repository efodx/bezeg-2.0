import type {FitBox} from '../../graphs/base/fitBoundingBox';
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';

/**
 * The pure seam between a graph's view and the fit. The prototype's port also held the JSXGraph `Board`, the container, a
 * module-level registry and the autofit switch; those are the director's and adapter's (slice 2), not the fit core's.
 *
 * The graph keeps the VIEW INTENT: the box it chose itself (default view, lesson frame view, loaded preset view). The fit
 * is computed from the intent and applied with `apply`, which never changes the intent; nothing feeds a fitted box back.
 */
export interface ViewPort {
    readonly equalAxisUnits: boolean;
    /** The intent box, or undefined before the graph has set any view. */
    intent(): FitBox | undefined;
    /** Sets the view without touching the intent. */
    apply(box: FitBox): void;
    /** The board's current box. */
    current(): FitBox;
    /** The declared marks of the present state. Absent: the whole intent is kept. */
    marks?(): ViewMarks | undefined;
}
