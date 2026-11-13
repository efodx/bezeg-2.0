// Gutter sizes for the side botanicals, taken from the measured content column of the current page
// (docs/specs/side-botanicals.md, decisions 4 and 5).

/** Clear space kept between the decoration and the content column. */
export const GUTTER_MARGIN = 24;
/** Narrower gutters carry no decoration. */
export const MIN_GUTTER = 100;
/** Pages mark the element whose content box is their content column with this attribute. */
export const COLUMN_SELECTOR = '[data-content-column]';

/** Left and right edges of the content column in viewport px. */
export interface ColumnEdges {left: number; right: number}
/** Width of each gutter's decoration in px; 0 where the gutter is too narrow. */
export interface Gutters {left: number; right: number}

/** Each side separately: the space from the viewport edge to the column, less the margin, rounded down. */
export function gutterWidths(column: ColumnEdges, viewportWidth: number): Gutters {
    const fit = (space: number): number => {
        const width = Math.floor(space - GUTTER_MARGIN);
        return width >= MIN_GUTTER ? width : 0;
    };
    return {left: fit(column.left), right: fit(viewportWidth - column.right)};
}

/** Content box of the column element: its bounding box without border and padding. */
export function columnEdges(element: Element): ColumnEdges {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    const px = (value: string): number => parseFloat(value) || 0;
    return {
        left: rect.left + px(style.borderLeftWidth) + px(style.paddingLeft),
        right: rect.right - px(style.borderRightWidth) - px(style.paddingRight),
    };
}
