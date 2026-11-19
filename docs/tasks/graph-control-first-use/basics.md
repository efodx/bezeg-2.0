# Basics control plans

[Full catalogue plan](README.md) · [Source spec and architecture](../../specs/graph-control-first-use.md#fit-with-the-current-architecture)

Compare against Bernstein when a proposed layout gets longer. Keep a reveal explicit on Complex multiplication so that the student can make a prediction.

**Implementation order.** Keep the stepper or reveal button visible on first entry.

<a id="bernstein"></a>

## Bernstein polynomials

[Audited](../../specs/graph-control-first-use.md#sample-and-visual-evidence) · [Open graph](https://efodx.github.io/bezeg-2.0/bernstein) · [BernsteinGraph](../../../src/graphs/bernstein/BernsteinGraph.tsx)

- **First task.** Keep the degree stepper as the opening experiment. Raise the degree once.
- **Other controls.** Leave the stacked-area representation in Display.
- **Acceptance.** Raising the degree from one to two changes the plot from two basis functions to three. The endpoint basis values can still be compared.

<a id="complex-multiplication"></a>

## Complex multiplication

Source-planned · [Open graph](https://efodx.github.io/bezeg-2.0/complex-multiplication) · [ComplexMultiplicationGraph](../../../src/graphs/complex/ComplexMultiplicationGraph.tsx)

- **First task.** Move one factor, predict the product, then use Show product.
- **Other controls.** Keep exact real and imaginary coordinates together. Reveal the arguments after the product.
- **Acceptance.** The marked product moves when a factor moves. Hiding it lets the next student make a prediction.
