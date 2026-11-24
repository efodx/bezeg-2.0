# 05 no locked pucks (2026-11-24)

- Phase portrait: `phase-a..d` declared only on the linear system; `phase-equilibrium` only on the pendulum. The Jacobian stays the `jacobian` readout row (name "Jacobijeva matrika" on nonlinear), so no new text.
- Linear map composition: per slot, `-index` only when the slot is a rotation or reflection; the four free entries only when it is free.
- `locked` mechanism kept, no declaration uses it. Taylor's "locked with min = max" comment in `checkDeclaration` is now unused by pilots.
