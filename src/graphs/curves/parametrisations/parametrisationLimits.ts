/**
 * Limits of the parametrisation Demonstrations, shared by their sliders and their lesson actions. The sample limits differ
 * by Demonstration, so a scene action that sets samples is valid only against the limits of the Demonstration it targets.
 */

/** The weight alpha of the parametrisation, on every parametrisation Demonstration. */
export const PARAMETERIZATION_ALPHA_MIN = 0;
export const PARAMETERIZATION_ALPHA_MAX = 1;

/** Sample points on the weighted and the uniform comparison Demonstrations (Bezier and PH curves). */
export const ALPHA_PARAM_MIN_SAMPLES = 1;
export const ALPHA_PARAM_MAX_SAMPLES = 40;

/** Sample points on the spline parametrisation Demonstration, where zero samples show the bare spline. */
export const SPLINE_ALPHA_MIN_SAMPLES = 0;
export const SPLINE_ALPHA_MAX_SAMPLES = 50;
