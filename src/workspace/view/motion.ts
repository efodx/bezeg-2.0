// The one clock of workspace motion (task 07): the view director's glide and the lesson morph share the duration and the curve,
// so a step's view and its numbers arrive together.
export const GLIDE_MS = 250;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
