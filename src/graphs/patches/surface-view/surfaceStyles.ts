import type {PolylineRole} from './surfaceScene';

/** Elderflower palette (from the reviewed prototype). */
export const SURFACE_COLORS = {
    net: 0x526950,
    iso: 0x547957,
    'iso-v': 0x7b4aa0, // purple; 6.3:1 on white
    'iso-w': 0xa86a00, // amber; 4.4:1 on white (non-text needs 3:1)
    boundary: 0x643f2f,
    construction: 0xc45f3b,
    'construction-2': 0xb02a73, // pink: the second stage of the tensor de Casteljau construction, also dashed
    highlight: 0x1f5fbf,
    compare: 0x0b7a75, // teal: the tensor patch beside the triangular one; 5.2:1 on white (5.18 computed)
    'vector-u': 0x0b4f9c, // blue, solid: S_u of the derivative demonstration
    'vector-v': 0xb3202a, // crimson, solid: S_v; blue and crimson differ strongly in hue
    twist: 0x6a2c91, // violet, dotted: S_uv
    normal: 0x2a2a2a, // near black, long-dashed: the unit normal
    'net-2': 0x9a4f12, // burnt orange, dashed: a second control net (subdivision piece, join patch B); 6.0:1 on white
    plane: 0x4f86c6, // the translucent tangent plane and its outline
    point: 0x5f8046, // 4.5:1 on the white clear colour (WCAG non-text needs 3:1); the former 0x7d9d61 was 3.06:1
    selected: 0x1f5fbf,
    marker: 0xca5c37,
    surface: 0xdcae78,
} as const;

/**
 * Dash pattern per role, as a fraction of the scene extent (the diagonal of the scene's bounding box),
 * so the dashes stay visible at any patch size. Roles not listed are drawn solid. The iso-curves are
 * told apart without colour: `iso` solid, `iso-v` dashed, `iso-w` dotted, `compare` long-dashed. The second
 * construction stage (`construction-2`) is short-dashed against the first stage's solid lines. In the derivative
 * demonstration `vector-u` and `vector-v` are solid (told apart by hue and their labels), `twist` is dotted and
 * `normal` is long-dashed. A second control net (`net-2`) is medium-dashed against the solid `net`.
 */
export const SURFACE_DASH = {
    'iso-v': {dash: 0.03, gap: 0.02},
    'iso-w': {dash: 0.014, gap: 0.014},
    compare: {dash: 0.07, gap: 0.03},
    'construction-2': {dash: 0.022, gap: 0.012},
    twist: {dash: 0.012, gap: 0.012},
    normal: {dash: 0.05, gap: 0.02},
    'net-2': {dash: 0.04, gap: 0.015},
} as const satisfies Partial<Record<PolylineRole, {dash: number; gap: number}>>;

export function dashFor(role: PolylineRole): {dash: number; gap: number} | undefined {
    return (SURFACE_DASH as Partial<Record<PolylineRole, {dash: number; gap: number}>>)[role];
}
