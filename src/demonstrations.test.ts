import {findDemonstration, getDemonstrationCatalog} from './demonstrations';
import {setLanguage} from './localization';
import {sl} from './localization/sl';
import {en} from './localization/en';

// Recorded from the pre-refactor routes, prompt rules, and graph title overrides.
const expected = [
    ['bernstein', 'basics', 'bernstein_polynomials', 'bernstein_polynomials', 'prompt_bernstein'],
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
    ['functions/linear', '/bezeg-2.0/functions', 'linear_function', 'linear_function', 'prompt_linear_function'],
    ['functions/exponential', '/bezeg-2.0/functions', 'exponential_function', 'exponential_function', 'prompt_exponential_function'],
    ['functions/trigonometric', '/bezeg-2.0/functions', 'trigonometric_functions', 'trigonometric_functions', 'prompt_trigonometric_functions'],
    ['functions/continuity', '/bezeg-2.0/functions', 'continuity', 'continuity', 'prompt_continuity'],
] as const;

afterEach(() => setLanguage('sl'));

test.each(['sl', 'en'] as const)('preserves every Demonstration in %s', language => {
    setLanguage(language);
    const messages = language === 'sl' ? sl : en;
    const catalog = getDemonstrationCatalog();
    expect(catalog.demonstrations.map(entry => entry.path)).toEqual(expected.map(([path]) => `/bezeg-2.0/${path}`));
    expect(new Set(catalog.demonstrations.map(entry => entry.id)).size).toBe(30);
    for (const [path, family, title, heading, prompt] of expected) {
        const demonstration = findDemonstration(`/bezeg-2.0/${path}`)!;
        expect(demonstration.family).toBe(family);
        expect(demonstration.catalogTitle).toBe(messages[title]);
        expect(demonstration.workspaceTitle).toBe(messages[heading]);
        expect(demonstration.prompts).toEqual([messages[prompt], messages[path === 'bezier/curve' ? 'prompt_control_polygon' : 'prompt_compare']]);
        expect(demonstration.navigationActions).toEqual(path === 'bernstein'
            ? ['left', 'up', 'down', 'right', 'in', 'out']
            : ['left', 'up', 'down', 'right', 'in', 'out', 'fit']);
        expect(catalog.demonstrations.find(entry => entry.path === demonstration.path)).toEqual(demonstration);
    }
    expect(catalog.families.map(family => family.id)).toEqual(['basics', '/bezeg-2.0/bezier', '/bezeg-2.0/rational', '/bezeg-2.0/spline', '/bezeg-2.0/ph', '/bezeg-2.0/param', '/bezeg-2.0/functions']);
    expect(catalog.families.map(family => family.title)).toEqual([
        messages.basics, messages.bezier_curves, messages.rational_bezier_curves, messages.splines, messages.ph_curves, messages.parametrizations, messages.functions_and_calculus,
    ]);
    expect(catalog.families.map(family => family.demonstrations.length)).toEqual([1, 8, 7, 5, 2, 3, 4]);
    expect(catalog.families.flatMap(family => family.demonstrations)).toEqual(catalog.demonstrations);
    expect(catalog.starting.map(entry => [entry.demonstration.path, entry.title, entry.description, entry.caption])).toEqual([
        ['/bezeg-2.0/bezier/curve', messages.bezier_curve_209, messages.example_bezier, messages.points_to_shape],
        ['/bezeg-2.0/bezier/decasteljau', messages.de_casteljau, messages.example_decasteljau, messages.interpolation_to_curve],
        ['/bezeg-2.0/ph/cubic', messages.degree_3_ph_curve, messages.example_ph, messages.ph_curve_to_offsets],
    ]);
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
    expect(getDemonstrationCatalog().demonstrations).toHaveLength(30);
});
