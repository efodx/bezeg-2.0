import {findDemonstration, getDemonstrationCatalog} from './demonstrations';
import {setLanguage} from './localization';
import {sl} from './localization/sl';
import {en} from './localization/en';

// Recorded from the pre-refactor routes, prompt rules, and graph title overrides.
const expected = [
    ['bernstein', 'basics', 'bernstein_polynomials', 'bernstein_polynomials', 'prompt_bernstein'],
    ['bezier/curve', '/bezeg/bezier', 'bezier_curve_209', 'bezier_curve', 'prompt_control_points'],
    ['bezier/decasteljau', '/bezeg/bezier', 'de_casteljau', 'de_casteljau', 'prompt_decasteljau'],
    ['bezier/decasteljau2', '/bezeg/bezier', 'de_casteljau_alternative', 'de_casteljau_alternative', 'prompt_decasteljau'],
    ['bezier/affine', '/bezeg/bezier', 'affine_transformations', 'affine_transformations', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['bezier/subdivision-2', '/bezeg/bezier', 'subdivision', 'subdivision', 'prompt_subdivision'],
    ['bezier/subdivision', '/bezeg/bezier', 'repeated_subdivision', 'repeated_subdivision', 'prompt_repeated_subdivision'],
    ['bezier/extrapolation', '/bezeg/bezier', 'extrapolation', 'extrapolation', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['bezier/elevation', '/bezeg/bezier', 'degree_elevation', 'degree_elevation', 'prompt_elevation'],
    ['rational/base', '/bezeg/rational', 'rational_bezier_curve', 'rational_bezier_curve', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['rational/rational-decasteljau', '/bezeg/rational', 'rational_de_casteljau', 'rational_de_casteljau', 'prompt_decasteljau'],
    ['rational/rational-elevation', '/bezeg/rational', 'degree_elevation', 'degree_elevation', 'prompt_elevation'],
    ['rational/rational-extrapolation', '/bezeg/rational', 'extrapolation', 'extrapolation', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['rational/rational-subdivision', '/bezeg/rational', 'subdivision', 'subdivision', 'prompt_subdivision'],
    ['rational/farin-points', '/bezeg/rational', 'farin_points', 'farin_points', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['rational/circlen', '/bezeg/rational', 'circle_from_n_pieces', 'circle_from_n_pieces', 'change_the_settings_and_observe_their_effect_on_the_graph'],
    ['spline/spline', '/bezeg/spline', 'onesided_cn_spline', 'onesided_cn_spline', 'prompt_spline'],
    ['spline/c1spline', '/bezeg/spline', 'symmetric_c1_spline', 'symmetric_c1_spline', 'prompt_spline'],
    ['spline/c2spline', '/bezeg/spline', 'symmetric_c2_spline', 'symmetric_c2_spline', 'prompt_spline'],
    ['spline/g1spline', '/bezeg/spline', 'onesided_g1_spline', 'onesided_g1_spline', 'prompt_spline'],
    ['spline/g1-sym-spline', '/bezeg/spline', 'symmetric_g1_spline', 'symmetric_g1_spline', 'prompt_spline'],
    ['ph/cubic', '/bezeg/ph', 'degree_3', 'degree_3_ph_curve', 'prompt_ph'],
    ['ph/quintic', '/bezeg/ph', 'degree_5_ph_curve', 'degree_5_ph_curve', 'prompt_ph'],
    ['param/param/alphaparam2', '/bezeg/param', 'parametrizations_233', 'parametrizations_233', 'prompt_parameterization'],
    ['param/param/alphaparam', '/bezeg/param', 'weighted_parametrization_234', 'weighted_parametrization_234', 'prompt_parameterization'],
    ['param/param/uniform', '/bezeg/param', 'uniform_parametrization_235', 'uniform_parametrization_235', 'prompt_parameterization'],
] as const;

afterEach(() => setLanguage('sl'));

test.each(['sl', 'en'] as const)('preserves every Demonstration in %s', language => {
    setLanguage(language);
    const messages = language === 'sl' ? sl : en;
    const catalog = getDemonstrationCatalog();
    expect(catalog.demonstrations.map(entry => entry.path)).toEqual(expected.map(([path]) => `/bezeg/${path}`));
    expect(new Set(catalog.demonstrations.map(entry => entry.id)).size).toBe(26);
    for (const [path, family, title, heading, prompt] of expected) {
        const demonstration = findDemonstration(`/bezeg/${path}`)!;
        expect(demonstration.family).toBe(family);
        expect(demonstration.catalogTitle).toBe(messages[title]);
        expect(demonstration.workspaceTitle).toBe(messages[heading]);
        expect(demonstration.prompts).toEqual([messages[prompt], messages[path === 'bezier/curve' ? 'prompt_control_polygon' : 'prompt_compare']]);
        expect(demonstration.navigationActions).toEqual(path === 'bernstein'
            ? ['left', 'up', 'down', 'right', 'in', 'out']
            : ['left', 'up', 'down', 'right', 'in', 'out', 'fit']);
        expect(catalog.demonstrations.find(entry => entry.path === demonstration.path)).toEqual(demonstration);
    }
    expect(catalog.families.map(family => family.id)).toEqual(['basics', '/bezeg/bezier', '/bezeg/rational', '/bezeg/spline', '/bezeg/ph', '/bezeg/param']);
    expect(catalog.families.map(family => family.title)).toEqual([
        messages.basics, messages.bezier_curves, messages.rational_bezier_curves, messages.splines, messages.ph_curves, messages.parametrizations,
    ]);
    expect(catalog.families.map(family => family.demonstrations.length)).toEqual([1, 8, 7, 5, 2, 3]);
    expect(catalog.families.flatMap(family => family.demonstrations)).toEqual(catalog.demonstrations);
    expect(catalog.starting.map(entry => [entry.demonstration.path, entry.title, entry.description, entry.caption])).toEqual([
        ['/bezeg/bezier/curve', messages.bezier_curve_209, messages.example_bezier, messages.points_to_shape],
        ['/bezeg/bezier/decasteljau', messages.de_casteljau, messages.example_decasteljau, messages.interpolation_to_curve],
        ['/bezeg/ph/cubic', messages.degree_3_ph_curve, messages.example_ph, messages.ph_curve_to_offsets],
    ]);
});

test.each(['/bezeg', '/bezeg/demonstrations', '/bezeg/ph/unknown', '/bezeg/bezier/curve/', '/bezeg/bezier/curve?x=1', '/bezeg/param/alphaparam'])('exact lookup excludes %s', path => {
    expect(findDemonstration(path)).toBeUndefined();
});

test('queries resolve the current language and do not expose shared mutable metadata', () => {
    setLanguage('sl');
    const previous = getDemonstrationCatalog();
    setLanguage('en');
    expect(findDemonstration('/bezeg/ph/cubic')?.workspaceTitle).toBe(en.degree_3_ph_curve);
    expect(getDemonstrationCatalog().families[0].title).toBe(en.basics);
    expect(previous.families[0].title).toBe(sl.basics);
    previous.demonstrations.splice(0);
    expect(getDemonstrationCatalog().demonstrations).toHaveLength(26);
});
