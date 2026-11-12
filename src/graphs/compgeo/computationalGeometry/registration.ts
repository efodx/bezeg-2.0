import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the computational-geometry family's sixteen legacy rows (spec lesson-authoring-architecture R1, task 06 batch 16,
 * the last registration batch). Imports no graph, React, lesson provider or localization value; executable surfaces live in
 * `runtime.ts`, Preset collections in `collections.ts`. The graphs stay in `../` (`compgeo/`).
 */
export const computationalGeometryFamilyId = 'computational-geometry';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them right after the plane-geometry rows. */
export const computationalGeometryDemonstrationRows = [
    {id: 'orientation', path: '/bezeg-2.0/compgeo/orientation', family: 'computational-geometry', title: 'compgeo_orientation_title', prompts: ['prompt_compgeo_orientation_turn', 'prompt_compgeo_orientation_collinear']},
    {id: 'polygon-area', path: '/bezeg-2.0/compgeo/polygon-area', family: 'computational-geometry', title: 'compgeo_polygon_area_title', prompts: ['prompt_compgeo_polygon_area_shoelace', 'prompt_compgeo_polygon_area_pick']},
    {id: 'convex-hull', path: '/bezeg-2.0/compgeo/convex-hull', family: 'computational-geometry', title: 'compgeo_convex_hull_title', prompts: ['prompt_compgeo_convex_hull_trace', 'prompt_compgeo_convex_hull_degenerate']},
    {id: 'point-in-polygon', path: '/bezeg-2.0/compgeo/point-in-polygon', family: 'computational-geometry', title: 'compgeo_point_in_polygon_title', prompts: ['prompt_compgeo_point_in_polygon_ray', 'prompt_compgeo_point_in_polygon_self_intersecting']},
    {id: 'hull-robustness', path: '/bezeg-2.0/compgeo/hull-robustness', family: 'computational-geometry', title: 'compgeo_hull_robustness_title', prompts: ['prompt_compgeo_hull_robustness_rule', 'prompt_compgeo_hull_robustness_kettner']},
    {id: 'bezier-hulls', path: '/bezeg-2.0/compgeo/bezier-hulls', family: 'computational-geometry', title: 'compgeo_bezier_hulls_title', prompts: ['prompt_compgeo_bezier_hulls_shrink', 'prompt_compgeo_bezier_hulls_apart']},
    {id: 'ear-clipping', path: '/bezeg-2.0/compgeo/ear-clipping', family: 'computational-geometry', title: 'compgeo_ear_clipping_title', prompts: ['prompt_compgeo_ear_clipping_ears', 'prompt_compgeo_ear_clipping_reflex']},
    {id: 'point-set-triangulation', path: '/bezeg-2.0/compgeo/point-set-triangulation', family: 'computational-geometry', title: 'compgeo_point_set_triangulation_title', prompts: ['prompt_compgeo_point_set_triangulation_flip', 'prompt_compgeo_point_set_triangulation_count']},
    {id: 'delaunay', path: '/bezeg-2.0/compgeo/delaunay', family: 'computational-geometry', title: 'compgeo_delaunay_title', prompts: ['prompt_compgeo_delaunay_illegal', 'prompt_compgeo_delaunay_cocircular']},
    {id: 'voronoi', path: '/bezeg-2.0/compgeo/voronoi', family: 'computational-geometry', title: 'compgeo_voronoi_title', prompts: ['prompt_compgeo_voronoi_cell', 'prompt_compgeo_voronoi_query']},
    {id: 'voronoi-degenerate', path: '/bezeg-2.0/compgeo/voronoi-degenerate', family: 'computational-geometry', title: 'compgeo_voronoi_degenerate_title', prompts: ['prompt_compgeo_voronoi_degenerate_cocircular', 'prompt_compgeo_voronoi_degenerate_collinear']},
    {id: 'interval-sweep', path: '/bezeg-2.0/compgeo/interval-sweep', family: 'computational-geometry', title: 'compgeo_interval_sweep_title', prompts: ['prompt_compgeo_interval_sweep_events', 'prompt_compgeo_interval_sweep_depth']},
    {id: 'segment-intersections', path: '/bezeg-2.0/compgeo/segment-intersections', family: 'computational-geometry', title: 'compgeo_segment_intersections_title', prompts: ['prompt_compgeo_segment_intersections_neighbours', 'prompt_compgeo_segment_intersections_swap']},
    {id: 'monotone-partition', path: '/bezeg-2.0/compgeo/monotone-partition', family: 'computational-geometry', title: 'compgeo_monotone_partition_title', prompts: ['prompt_compgeo_monotone_partition_vertex_types', 'prompt_compgeo_monotone_partition_diagonals']},
    {id: 'monotone-triangulation', path: '/bezeg-2.0/compgeo/monotone-triangulation', family: 'computational-geometry', title: 'compgeo_monotone_triangulation_title', prompts: ['prompt_compgeo_monotone_triangulation_stack', 'prompt_compgeo_monotone_triangulation_chains']},
    {id: 'fortune', path: '/bezeg-2.0/compgeo/fortune', family: 'computational-geometry', title: 'compgeo_fortune_title', prompts: ['prompt_compgeo_fortune_false_alarm', 'prompt_compgeo_fortune_delaunay_dual']},
] as const satisfies readonly Definition[];

export type ComputationalGeometryDemonstrationId = typeof computationalGeometryDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); these differ from the ids. */
export const computationalGeometryCollectionKeys = {
    'orientation': 'compgeo-orientation',
    'polygon-area': 'compgeo-polygon-area',
    'convex-hull': 'compgeo-hull-trace',
    'point-in-polygon': 'compgeo-point-in-polygon',
    'hull-robustness': 'compgeo-hull-robustness',
    'bezier-hulls': 'compgeo-bezier-hulls',
    'ear-clipping': 'compgeo-ear-clipping',
    'point-set-triangulation': 'compgeo-triangulation',
    'delaunay': 'compgeo-delaunay',
    'voronoi': 'compgeo-voronoi',
    'voronoi-degenerate': 'compgeo-voronoi-degenerate',
    'interval-sweep': 'compgeo-interval-sweep',
    'segment-intersections': 'compgeo-bentley-ottmann',
    'monotone-partition': 'compgeo-monotone-partition',
    'monotone-triangulation': 'compgeo-monotone-triangulation',
    'fortune': 'compgeo-fortune',
} as const satisfies Record<ComputationalGeometryDemonstrationId, string>;
