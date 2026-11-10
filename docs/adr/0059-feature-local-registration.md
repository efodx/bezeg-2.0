# Feature-local registration of a Demonstration family

Accepted on 2026-11-10 (controls step 9, [spec section 3](../specs/lesson-authoring-architecture.md#3-feature-local-registration)).

## Decision

A family registers itself through explicit family-local exports with three separate loading surfaces: cheap metadata (`registration.ts`), Preset collection definitions (`collections.ts`) and lazy graph loaders (`runtime.ts`). The roots (`demonstrations.ts`, `graphLoaders.ts`, `PresetImport.ts`) spread each family export explicitly, and the capture and generator tools name the same metadata module. Metadata never imports the runtime surface, so the catalog and persistence load no graph constructor. Projective conics is the first and so far only migrated family; the others keep legacy central composition, guarded by a disjointness check. `registrationDeletion.test.ts` fails when a central file names a projective id, path or collection key again.

## Alternatives

- Directory discovery (`import.meta.glob`). It hides the composition point and loads or orders modules implicitly, so a moved file could reorder the catalog.
- A generated family manifest or JSON mirror. It adds a second source of truth and a freshness step, and no tooling constraint needs it: the generator already reads TypeScript through its Vite `ssrLoadModule` bridge.
- Migrating every family at once. The change would be large, hard to review and impossible to bisect; one family proves the seams first.

## Consequences

- Adding a Demonstration to a migrated family needs no central per-Demonstration edit; a new family needs one explicit root inclusion per loading surface.
- No user-visible change: routes, Presets and files are unchanged.
- Two composition styles coexist until the remaining families migrate.
