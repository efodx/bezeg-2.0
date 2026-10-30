import {DisplaySettings} from '../../base/DisplaySettings';
import type {MarkerRole, PolylineRole} from './surfaceScene';
import {dashFor, SURFACE_COLORS} from './surfaceStyles';

/**
 * Styling of the JSXGraph surface view (task 03 of docs/specs/jsxgraph-surface-view.md).
 *
 * The visual meaning of every role is the one the Three view draws: hue per role from the shared elderflower palette
 * (`surfaceStyles.ts`) and, where Three dashes a role, a dash pattern of the same length class. Line weights come
 * from the 2D graph token `DisplaySettings.strokeWidth` (default 2): curve-level geometry at the 2D comparison-curve
 * weight (0.85), secondary geometry thinner, the iso families thinnest.
 */

export interface DrawableStyle {
    stroke: string;
    width: number;
    fill?: string;
    fillOpacity?: number;
    /** JSXGraph `dash` index (0 = solid), the same mechanism the 2D boards use. */
    dash: number;
}

const BASE_WIDTH = new DisplaySettings().strokeWidth;
const CURVE_WEIGHT = 0.85 * BASE_WIDTH;
const SECONDARY_WEIGHT = 0.6 * BASE_WIDTH;
const ISO_WEIGHT = 0.45 * BASE_WIDTH;
/** Facet outline in the facet colour; it only hides anti-aliasing seams between neighbouring triangles. */
export const MESH_SEAM_WIDTH = 0.6;
export const PLANE_FILL_OPACITY = 0.3;

const ROLE_WEIGHT: Record<PolylineRole, number> = {
    net: SECONDARY_WEIGHT, 'net-2': SECONDARY_WEIGHT, construction: SECONDARY_WEIGHT, 'construction-2': SECONDARY_WEIGHT,
    compare: SECONDARY_WEIGHT,
    iso: ISO_WEIGHT, 'iso-v': ISO_WEIGHT, 'iso-w': ISO_WEIGHT,
    boundary: CURVE_WEIGHT, 'vector-u': CURVE_WEIGHT, 'vector-v': CURVE_WEIGHT, twist: CURVE_WEIGHT, normal: CURVE_WEIGHT,
    highlight: BASE_WIDTH,
};

export function cssColor(rgb: number): string {
    return `#${rgb.toString(16).padStart(6, '0')}`;
}

/** Three dashes in fractions of the scene extent; SVG has fixed JSXGraph patterns, chosen by dash length. */
function dashIndex(role: PolylineRole): number {
    const d = dashFor(role);
    if (!d) return 0;
    if (d.dash <= 0.014) return 1;
    if (d.dash <= 0.022) return 2;
    if (d.dash <= 0.04) return 3;
    return 4;
}

export function polylineStyle(role: PolylineRole): DrawableStyle {
    return {stroke: cssColor(SURFACE_COLORS[role]), width: ROLE_WEIGHT[role], dash: dashIndex(role)};
}

export const MESH_STYLE: DrawableStyle = {
    stroke: cssColor(SURFACE_COLORS.surface), width: MESH_SEAM_WIDTH, fill: cssColor(SURFACE_COLORS.surface), fillOpacity: 1, dash: 0,
};

export const PLANE_STYLE: DrawableStyle = {
    stroke: cssColor(SURFACE_COLORS.plane), width: SECONDARY_WEIGHT, fill: cssColor(SURFACE_COLORS.plane),
    fillOpacity: PLANE_FILL_OPACITY, dash: 0,
};

export function markerColor(role: MarkerRole): string {
    return cssColor(role === 'evaluated' ? SURFACE_COLORS.marker : SURFACE_COLORS[role]);
}
