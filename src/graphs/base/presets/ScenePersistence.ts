/**
 * A graph family's projection companion to its Preset collection: the one declaration of how runtime scene state becomes
 * persisted `data` plus permitted `graphState`, and how checked persisted values become runtime scene state again.
 * Trusted checkpoints do not use it: they capture and restore the full runtime state directly.
 */
export interface ScenePersistence<D, S> {
    /** Runtime state -> the Preset's data (the model, once) and the persisted state the collection permits. */
    project(state: S): {readonly data: D; readonly graphState: {initialized: boolean}};
    /**
     * Checked data and permitted state over the graph defaults -> runtime state. Derived values are recomputed by the
     * domain functions; no field of `permittedState` outside the declared ones can reach the result.
     */
    reconstruct(data: D, permittedState: unknown, defaults: S): S;
}
