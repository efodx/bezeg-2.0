import {findDemonstration, getDemonstrationCatalog, resolveDemonstrationDefinition} from './demonstrations';
import {setLanguage} from './localization';
import {sl} from './localization/sl';
import {en} from './localization/en';

// Recorded from the pre-refactor routes, prompt rules, and graph title overrides.
const expected = [
    ['bernstein', 'basics', 'bernstein_polynomials', 'bernstein_polynomials', 'prompt_bernstein'],
    ['complex-multiplication', 'basics', 'complex_multiplication', 'complex_multiplication', 'prompt_complex_multiplication'],
    ['bezier/curve', '/bezeg-2.0/bezier', 'bezier_curve_209', 'bezier_curve', 'prompt_control_points'],
    ['bezier/decasteljau', '/bezeg-2.0/bezier', 'de_casteljau', 'de_casteljau', 'prompt_decasteljau'],
    ['bezier/decasteljau2', '/bezeg-2.0/bezier', 'de_casteljau_alternative', 'de_casteljau_alternative', 'prompt_decasteljau'],
    ['bezier/affine', '/bezeg-2.0/bezier', 'affine_transformations', 'affine_transformations', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['bezier/subdivision-2', '/bezeg-2.0/bezier', 'subdivision', 'subdivision', 'prompt_subdivision'],
    ['bezier/subdivision', '/bezeg-2.0/bezier', 'repeated_subdivision', 'repeated_subdivision', 'prompt_repeated_subdivision'],
    ['bezier/extrapolation', '/bezeg-2.0/bezier', 'extrapolation', 'extrapolation', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['bezier/elevation', '/bezeg-2.0/bezier', 'degree_elevation', 'degree_elevation', 'prompt_elevation'],
    ['rational/base', '/bezeg-2.0/rational', 'rational_bezier_curve', 'rational_bezier_curve', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['rational/rational-decasteljau', '/bezeg-2.0/rational', 'rational_de_casteljau', 'rational_de_casteljau', 'prompt_decasteljau'],
    ['rational/rational-elevation', '/bezeg-2.0/rational', 'degree_elevation', 'degree_elevation', 'prompt_elevation'],
    ['rational/rational-extrapolation', '/bezeg-2.0/rational', 'extrapolation', 'extrapolation', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['rational/rational-subdivision', '/bezeg-2.0/rational', 'subdivision', 'subdivision', 'prompt_subdivision'],
    ['rational/farin-points', '/bezeg-2.0/rational', 'farin_points', 'farin_points', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['rational/circlen', '/bezeg-2.0/rational', 'circle_from_n_pieces', 'circle_from_n_pieces', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['spline/spline', '/bezeg-2.0/spline', 'onesided_cn_spline', 'onesided_cn_spline', 'prompt_spline'],
    ['spline/c1spline', '/bezeg-2.0/spline', 'symmetric_c1_spline', 'symmetric_c1_spline', 'prompt_spline'],
    ['spline/c2spline', '/bezeg-2.0/spline', 'symmetric_c2_spline', 'symmetric_c2_spline', 'prompt_spline'],
    ['spline/g1spline', '/bezeg-2.0/spline', 'onesided_g1_spline', 'onesided_g1_spline', 'prompt_spline'],
    ['spline/g1-sym-spline', '/bezeg-2.0/spline', 'symmetric_g1_spline', 'symmetric_g1_spline', 'prompt_spline'],
    ['ph/cubic', '/bezeg-2.0/ph', 'degree_3', 'degree_3_ph_curve', 'prompt_ph'],
    ['ph/quintic', '/bezeg-2.0/ph', 'degree_5_ph_curve', 'degree_5_ph_curve', 'prompt_ph'],
    ['param/param/alphaparam2', '/bezeg-2.0/param', 'parametrizations_233', 'parametrizations_233', 'prompt_parameterization'],
    ['param/param/alphaparam', '/bezeg-2.0/param', 'weighted_parametrization_234', 'weighted_parametrization_234', 'prompt_parameterization'],
    ['param/param/uniform', '/bezeg-2.0/param', 'uniform_parametrization_235', 'uniform_parametrization_235', 'prompt_parameterization'],
    ['curve-geometry/parametric', '/bezeg-2.0/curve-geometry', 'parametric_curves_title', 'parametric_curves_title', 'prompt_parametric_curve'],
    ['curve-geometry/curvature', '/bezeg-2.0/curve-geometry', 'curvature_circle_title', 'curvature_circle_title', 'prompt_curvature'],
    ['interpolation/lagrange', '/bezeg-2.0/interpolation', 'interp_lagrange_title', 'interp_lagrange_title', 'prompt_interp_lagrange'],
    ['interpolation/hermite', '/bezeg-2.0/interpolation', 'interp_hermite_title', 'interp_hermite_title', 'prompt_interp_hermite'],
    ['interpolation/runge', '/bezeg-2.0/interpolation', 'interp_runge_title', 'interp_runge_title', 'prompt_interp_runge'],
    ['interpolation/least-squares', '/bezeg-2.0/interpolation', 'interp_lsq_title', 'interp_lsq_title', 'prompt_interp_least_squares'],
    ['interpolation/subdivision', '/bezeg-2.0/interpolation', 'interp_subdivision_title', 'interp_subdivision_title', 'prompt_interp_subdivision'],
    ['bspline/basis', '/bezeg-2.0/bspline', 'bspline_basis_title', 'bspline_basis_title', 'prompt_bspline_basis'],
    ['bspline/deboor', '/bezeg-2.0/bspline', 'bspline_deboor_title', 'bspline_deboor_title', 'prompt_bspline_deboor'],
    ['patches/tensor', '/bezeg-2.0/patches', 'tensor_product_bezier_patch', 'tensor_product_bezier_patch', 'prompt_patch_net'],
    ['patches/decasteljau', '/bezeg-2.0/patches', 'patch_decasteljau_algorithm', 'patch_decasteljau_algorithm', 'prompt_patch_decasteljau_order'],
    ['patches/derivatives', '/bezeg-2.0/patches', 'patch_derivatives_title', 'patch_derivatives_title', 'prompt_patch_derivatives_tangents'],
    ['patches/subdivision', '/bezeg-2.0/patches', 'patch_subdivision_title', 'patch_subdivision_title', 'prompt_patch_subdivision_pieces'],
    ['patches/joins', '/bezeg-2.0/patches', 'patch_joins_title', 'patch_joins_title', 'prompt_patch_joins_c1'],
    ['patches/triangular', '/bezeg-2.0/patches', 'triangular_bezier_patch', 'triangular_bezier_patch', 'prompt_patch_triangular_net'],
    ['patches/coons', '/bezeg-2.0/patches', 'coons_patch_title', 'coons_patch_title', 'prompt_coons_boundaries'],
    ['functions/linear', '/bezeg-2.0/functions', 'linear_function', 'linear_function', 'prompt_linear_function'],
    ['functions/exponential', '/bezeg-2.0/functions', 'exponential_function', 'exponential_function', 'prompt_exponential_function'],
    ['functions/trigonometric', '/bezeg-2.0/functions', 'trigonometric_functions', 'trigonometric_functions', 'prompt_trigonometric_functions'],
    ['functions/transformations', '/bezeg-2.0/functions', 'function_transformation_title', 'function_transformation_title', 'prompt_function_transformation'],
    ['functions/inverse', '/bezeg-2.0/functions', 'function_inverse_title', 'function_inverse_title', 'prompt_function_inverse'],
    ['functions/continuity', '/bezeg-2.0/functions', 'continuity', 'continuity', 'prompt_continuity'],
    ['functions/derivative', '/bezeg-2.0/functions', 'derivative', 'derivative', 'prompt_derivative'],
    ['functions/integral', '/bezeg-2.0/functions', 'definite_integral', 'definite_integral', 'prompt_definite_integral'],
    ['functions/area-between', '/bezeg-2.0/functions', 'area_between_curves', 'area_between_curves', 'prompt_area_between_curves'],
    ['functions/arc-length', '/bezeg-2.0/functions', 'curve_arc_length', 'curve_arc_length', 'prompt_curve_arc_length'],
    ['analysis/bisection', 'analysis', 'bisection', 'bisection', 'prompt_bisection'],
    ['analysis/root-finding', 'analysis', 'root_finding_title', 'root_finding_title', 'prompt_root_finding'],
    ['analysis/mean-value', 'analysis', 'mean_value', 'mean_value', 'prompt_mean_value'],
    ['analysis/accumulation', 'analysis', 'accumulation', 'accumulation', 'prompt_accumulation'],
    ['analysis/darboux', 'analysis', 'darboux', 'darboux', 'prompt_darboux'],
    ['analysis/extrema', 'analysis', 'extrema', 'extrema', 'prompt_extrema'],
    ['analysis/convexity', 'analysis', 'convexity', 'convexity', 'prompt_convexity'],
    ['analysis/taylor', 'analysis', 'taylor', 'taylor', 'prompt_taylor'],
    ['analysis/sequence', 'analysis', 'sequence', 'sequence', 'prompt_sequence'],
    ['analysis/uniform-convergence', 'analysis', 'uniform_convergence', 'uniform_convergence', 'prompt_uniform_convergence'],
    ['analysis/fourier-series', 'analysis', 'fourier_series_title', 'fourier_series_title', 'prompt_fourier_series'],
    ['analysis/fixed-point', 'analysis', 'fixed_point', 'fixed_point', 'prompt_fixed_point'],
    ['linear-map', 'maps', 'linear_map_title', 'linear_map_title', 'linear_map_prompt'],
    ['complex-reciprocal', 'maps', 'complex_reciprocal_title', 'complex_reciprocal_title', 'complex_reciprocal_prompt'],
    ['complex-roots', 'maps', 'complex_roots_title', 'complex_roots_title', 'complex_roots_prompt'],
    ['triangle-centres', 'plane-geometry', 'triangle_centres_title', 'triangle_centres_title', 'triangle_centres_prompt'],
    ['inscribed-angle', 'plane-geometry', 'inscribed_angle_title', 'inscribed_angle_title', 'inscribed_angle_prompt'],
    ['euler-line', 'plane-geometry', 'euler_line_title', 'euler_line_title', 'euler_line_prompt'],
    ['simson-line', 'plane-geometry', 'simson_line_title', 'simson_line_title', 'simson_line_prompt'],
    ['inversion', 'plane-geometry', 'inversion_title', 'inversion_title', 'inversion_prompt'],
    ['compgeo/orientation', 'computational-geometry', 'compgeo_orientation_title', 'compgeo_orientation_title', 'prompt_compgeo_orientation_turn'],
    ['compgeo/polygon-area', 'computational-geometry', 'compgeo_polygon_area_title', 'compgeo_polygon_area_title', 'prompt_compgeo_polygon_area_shoelace'],
    ['compgeo/convex-hull', 'computational-geometry', 'compgeo_convex_hull_title', 'compgeo_convex_hull_title', 'prompt_compgeo_convex_hull_trace'],
    ['compgeo/ear-clipping', 'computational-geometry', 'compgeo_ear_clipping_title', 'compgeo_ear_clipping_title', 'prompt_compgeo_ear_clipping_ears'],
    ['compgeo/point-set-triangulation', 'computational-geometry', 'compgeo_point_set_triangulation_title', 'compgeo_point_set_triangulation_title', 'prompt_compgeo_point_set_triangulation_flip'],
    ['compgeo/delaunay', 'computational-geometry', 'compgeo_delaunay_title', 'compgeo_delaunay_title', 'prompt_compgeo_delaunay_illegal'],
    ['compgeo/interval-sweep', 'computational-geometry', 'compgeo_interval_sweep_title', 'compgeo_interval_sweep_title', 'prompt_compgeo_interval_sweep_events'],
    ['compgeo/segment-intersections', 'computational-geometry', 'compgeo_segment_intersections_title', 'compgeo_segment_intersections_title', 'prompt_compgeo_segment_intersections_neighbours'],
    ['projective/cross-ratio', 'projective', 'projective_cross_ratio_title', 'projective_cross_ratio_title', 'prompt_projective_cross_ratio_preserved'],
    ['projective/pascal', 'projective', 'projective_pascal_title', 'projective_pascal_title', 'prompt_projective_pascal_collinear'],
    ['projective/pole-polar', 'projective', 'projective_pole_polar_title', 'projective_pole_polar_title', 'prompt_projective_pole_polar_tangents'],
] as const;

afterEach(() => setLanguage('sl'));

test.each(['sl', 'en'] as const)('preserves every Demonstration in %s', language => {
    setLanguage(language);
    const messages = language === 'sl' ? sl : en;
    const catalog = getDemonstrationCatalog();
    expect(catalog.demonstrations.map(entry => entry.path)).toEqual(expected.map(([path]) => `/bezeg-2.0/${path}`));
    expect(new Set(catalog.demonstrations.map(entry => entry.id)).size).toBe(84);
    for (const [path, family, title, heading, prompt] of expected) {
        const demonstration = findDemonstration(`/bezeg-2.0/${path}`)!;
        expect(demonstration.family).toBe(family);
        expect(demonstration.catalogTitle).toBe(messages[title]);
        expect(demonstration.workspaceTitle).toBe(messages[heading]);
        expect(demonstration.prompts).toEqual([messages[prompt], messages[path === 'bezier/curve' ? 'prompt_control_polygon' : path === 'patches/coons' ? 'prompt_coons_blend' : path === 'patches/tensor' ? 'prompt_patch_degree' : path === 'patches/decasteljau' ? 'prompt_patch_decasteljau_levels' : path === 'patches/derivatives' ? 'prompt_patch_derivatives_normal' : path === 'patches/subdivision' ? 'prompt_patch_subdivision_elevation' : path === 'patches/joins' ? 'prompt_patch_joins_g1' : path === 'patches/triangular' ? 'prompt_patch_barycentric' : path === 'compgeo/orientation' ? 'prompt_compgeo_orientation_collinear' : path === 'compgeo/polygon-area' ? 'prompt_compgeo_polygon_area_pick' : path === 'compgeo/convex-hull' ? 'prompt_compgeo_convex_hull_degenerate' : path === 'compgeo/ear-clipping' ? 'prompt_compgeo_ear_clipping_reflex' : path === 'compgeo/point-set-triangulation' ? 'prompt_compgeo_point_set_triangulation_count' : path === 'compgeo/delaunay' ? 'prompt_compgeo_delaunay_cocircular' : path === 'compgeo/interval-sweep' ? 'prompt_compgeo_interval_sweep_depth' : path === 'compgeo/segment-intersections' ? 'prompt_compgeo_segment_intersections_swap' : path === 'projective/cross-ratio' ? 'prompt_projective_cross_ratio_infinity' : path === 'projective/pascal' ? 'prompt_projective_pascal_degenerate' : path === 'projective/pole-polar' ? 'prompt_projective_pole_polar_infinity' : 'prompt_compare']]);
        expect(demonstration.navigationActions).toEqual(path === 'bernstein'
            ? ['left', 'up', 'down', 'right', 'in', 'out']
            : path.startsWith('patches/') ? [] : ['left', 'up', 'down', 'right', 'in', 'out', 'fit']);
        expect(catalog.demonstrations.find(entry => entry.path === demonstration.path)).toEqual(demonstration);
    }
    expect(catalog.families.map(family => family.id)).toEqual(['basics', '/bezeg-2.0/bezier', '/bezeg-2.0/rational', '/bezeg-2.0/spline', '/bezeg-2.0/ph', '/bezeg-2.0/param', '/bezeg-2.0/curve-geometry', '/bezeg-2.0/interpolation', '/bezeg-2.0/bspline', '/bezeg-2.0/patches', '/bezeg-2.0/functions', 'analysis', 'maps', 'plane-geometry', 'computational-geometry', 'projective']);
    expect(catalog.families.map(family => family.title)).toEqual([
        messages.basics, messages.bezier_curves, messages.rational_bezier_curves, messages.splines, messages.ph_curves, messages.parametrizations, messages.curve_geometry, messages.interpolation_and_approximation, messages.b_splines, messages.bezier_patches, messages.functions_and_calculus, messages.analysis, messages.maps_of_the_plane, messages.plane_geometry, messages.computational_geometry, messages.projective_conics,
    ]);
    expect(catalog.families.map(family => family.demonstrations.length)).toEqual([2, 8, 7, 5, 2, 3, 2, 5, 2, 7, 10, 12, 3, 5, 8, 3]);
    expect(catalog.families.flatMap(family => family.demonstrations)).toEqual(catalog.demonstrations);
    expect(catalog.starting.map(entry => [entry.demonstration.path, entry.title, entry.description, entry.caption])).toEqual([
        ['/bezeg-2.0/bezier/curve', messages.bezier_curve_209, messages.example_bezier, messages.points_to_shape],
        ['/bezeg-2.0/bezier/decasteljau', messages.de_casteljau, messages.example_decasteljau, messages.interpolation_to_curve],
        ['/bezeg-2.0/ph/cubic', messages.degree_3_ph_curve, messages.example_ph, messages.ph_curve_to_offsets],
    ]);
});

test('a family without shipped demonstrations is omitted from the catalog', () => {
    // `analysis` is declared in lockstep with its titles but appears only once a demonstration belongs to it.
    const catalog = getDemonstrationCatalog();
    expect(catalog.families.every(family => family.demonstrations.length > 0)).toBe(true);
    expect(catalog.families.some(family => family.id === 'analysis'))
        .toBe(catalog.demonstrations.some(demonstration => demonstration.family === 'analysis'));
    expect(sl.analysis).toBe('Analiza');
    expect(en.analysis).toBe('Analysis');
});

test.each(['/bezeg-2.0', '/bezeg-2.0/demonstrations', '/bezeg-2.0/ph/unknown', '/bezeg-2.0/bezier/curve/', '/bezeg-2.0/bezier/curve?x=1', '/bezeg-2.0/param/alphaparam'])('exact lookup excludes %s', path => {
    expect(findDemonstration(path)).toBeUndefined();
});

test('queries resolve the current language and do not expose shared mutable metadata', () => {
    setLanguage('sl');
    const previous = getDemonstrationCatalog();
    setLanguage('en');
    expect(findDemonstration('/bezeg-2.0/ph/cubic')?.workspaceTitle).toBe(en.degree_3_ph_curve);
    expect(getDemonstrationCatalog().families[0].title).toBe(en.basics);
    expect(previous.families[0].title).toBe(sl.basics);
    previous.demonstrations.splice(0);
    expect(getDemonstrationCatalog().demonstrations).toHaveLength(84);
});

test('a surface definition has no pan or zoom actions and every catalog entry keeps the board view', () => {
    setLanguage('en');
    const fixture = {id: 'bezier', path: '/bezeg-2.0/fixture-surface', family: '/bezeg-2.0/bezier', title: 'bezier_curve', prompts: ['prompt_control_points', 'prompt_compare'], view: 'surface'} as const;
    const surface = resolveDemonstrationDefinition(fixture);
    expect(surface.view).toBe('surface');
    expect(surface.navigationActions).toEqual([]);
    expect(resolveDemonstrationDefinition({...fixture, view: undefined}).navigationActions).toContain('in');
    expect(getDemonstrationCatalog().demonstrations.filter(entry => entry.view === 'surface').map(entry => entry.id)).toEqual(['patch-tensor', 'patch-decasteljau', 'patch-derivatives', 'patch-subdivision', 'patch-joins', 'patch-triangular', 'patch-coons']);
    expect(getDemonstrationCatalog().demonstrations.filter(entry => entry.view === 'board').every(entry => entry.navigationActions.length >= 6)).toBe(true);
});
