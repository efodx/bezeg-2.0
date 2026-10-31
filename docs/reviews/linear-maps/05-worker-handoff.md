# Linear maps 05 worker handoff (partial)

State: graph, scene helpers, Preset collection, 53 localization keys (sl/en), lesson action kind and tests are written. `just unit src/graphs/linear` passed (33 tests, after the last label rename); `just unit src/graphs/linear src/linear` passed earlier (96) before the host test existed. `npx tsc --noEmit` clean before the host test and the mode-label rename.

Files: src/graphs/linear/{LinearMapGraph.tsx, linearMapScene.ts, linearMapPresetCollection.ts, LinearMapGraph.test.ts, LinearMapGraph.host.test.tsx}; src/learning/model.ts (new `linear-map` LessonAction kind, outside the stated scope); src/localization/{sl,en}.ts (53 keys before invalid_function_data; mode label renamed "Nacin prikaza"/"View mode" because "Prikaz" collided with a shell label).

Remaining: (1) final `npx tsc --noEmit --pretty false` and `npm run build`; (2) deliberate-mutation evidence for each test group (not run); (3) add shipped terms (linearna preslikava, matrika, slika baze, determinanta, predznacena ploscina, orientacija ohranjena/obrnjena) to the table in docs/localization.md (not done); (4) review of the model.ts addition by the handler; (5) no browser viewing.
