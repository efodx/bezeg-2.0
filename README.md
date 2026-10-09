# Bezeg

**Explore the mathematics of curves, one control point at a time.**

Bezeg is an interactive educational app for students and educators. Drag control points, adjust parameters, and follow geometric constructions to see how Bézier curves, splines, and Pythagorean hodograph (PH) curves work.

[**Open Bezeg →**](https://efodx.github.io/bezeg/) · [Documentation](docs/README.md) · [Roadmap](docs/roadmap.md)

## Explore

The app brings together 26 interactive demonstrations:

| Topic | What you can explore |
| --- | --- |
| Foundations | Bernstein polynomials and their basis functions |
| Bézier curves | De Casteljau's construction, affine transformations, subdivision, extrapolation, and degree elevation |
| Rational curves | Weights, rational constructions, Farin points, and circle pieces |
| Splines | Cⁿ, C¹, C², and G¹ continuity constructions |
| PH curves | Cubic and quintic curves, generating points, and offsets |
| Parameterization | Weighted parameters, spline α parameters, and approximately equal-distance PH sampling |

Controls vary by demonstration. Save examples as browser-local presets, exchange preset files, and export figures as SVG or PNG. Presentation mode gives the graph more room for classroom use.

Bezeg runs in the browser without accounts or a backend. The interface is currently in **Slovenian**; English support is planned. See the [capability map](docs/capabilities.md) and [UI guide](docs/ui-functionality.md) for the full inventory and current limitations.

## Run locally

With Node.js and npm installed, run these commands from the project directory:

```sh
npm install
npm start
```

Open [localhost:3000/bezeg/](http://localhost:3000/bezeg/) in your browser. The development server reloads when you edit the source.

The current stack is React, TypeScript, JSXGraph, and Bootstrap, built with Create React App. See [technical architecture](docs/current-architecture.md) for how the app shell, geometry, graph adapters, and presets fit together.

## Check your changes

Run the mathematical regression checks:

```sh
npm test -- --watchAll=false --runInBand --runTestsByPath src/bezeg/impl/curve/bezier-evaluation.test.ts
```

Run the full test suite:

```sh
npm test -- --watchAll=false --runInBand
```

The full suite currently includes an outdated starter test in `src/App.test.tsx` that fails because it lacks router/context setup. See [current coverage](docs/current-architecture.md#current-coverage) for the testing status and [the performance plan](docs/performance-plan.md) for interaction measurements.

## Build and publish

Create the production bundle in `build/`:

```sh
npm run build
```

Publish to GitHub Pages using the repository's deployment script:

```sh
npm run deploy
```

The deploy command builds first through `predeploy`, then publishes `build/` using `gh-pages`. The app uses the `/bezeg/` base path and a redirect fallback for direct route links. Confirm that the repository's Pages publishing settings match the script before deploying; remote settings have not been verified. The [GitHub Pages SPA playbook](docs/github-pages-spa-playbook.md) covers routing, assets, and publishing checks.

## Contribute

Start with the [documentation index](docs/README.md) and [contributor instructions](AGENTS.md). Contributor documentation is in English.

- [Future plan](docs/future-plan.md) — the agreed direction and open decisions.
- [Guardrails](docs/guardrails.md) — product constraints, mathematical correctness, and engineering practices.
- [Roadmap](docs/roadmap.md) — the sequence of improvements and acceptance criteria.
- [Domain glossary](GLOSSARY.md) — the project's mathematical and technical vocabulary.

The direction is a clearer educational workspace with a prominent graph, understandable controls, responsive interactions, and Bezeg's elderflower identity. Keep changes bounded, preserve mathematical meaning, and match verification to the work.
