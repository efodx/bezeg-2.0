# 04 — Restrict rational zeros to the original domain

Status: done, 2026-11-19, commit b651c7b4; mathematical review, verified by focused unit tests, `just check-changed` at bdb27583 and browser smoke (sl and en; 310 px readout not captured; the hole marker sits under the numerator-zero edit handle). Source: [specification](../../specs/master-review-followups-2026-11.md#rational-function-domain--m2), RD1–RD3. Finding M2. Dependencies: none.

## Outcome and scope

Rational-function facts and their graph consumers distinguish zeros from excluded holes and poles. Start at analysis/rationalFunctionModel.ts:rationalFacts, rational.ts and RationalFunctionGraph.tsx. Preserve the existing factor model and its exact equality rules.

## Work

1. Add the failing Hole-example edit with numerator multiplicity 2 at 1. Require the hole at (1,0), only the zero −1 and undefined evaluation at 1.
2. Use the authoritative original-domain exclusions when deriving zeros. Inventory zero facts used by labels, markers, live readouts and descriptions so one corrected fact set reaches all consumers.
3. Preserve cancelled and uncancelled multiplicities, poles and input/persistence behavior. Remove any consumer-side workaround made unnecessary by the corrected facts.

## Verification and completion

Cover RD1–RD3 using the source specification's factor/zero/exclusion table, plus distinct nearby allowed roots. Assert zero lists, undefined evaluation at excluded points, and the expected hole height or pole together; merely removing the wrong zero label is insufficient. Verify a hole at height zero remains visible as a hole and is not presented as a zero of the rational function; preserve the distinct numerator/denominator factor-edit markers. Require the expected board objects/readouts to exist and agree after the edit, Reset, Preset reopen and lesson restore.

Run focused `just unit` for the rational kernel/model/graph and `just check-changed`. Obtain mathematical review and `$smoke-tester` for Rational functions in both languages; inspect the readout at 310 px inspector width. Record a failing-before test and the verified revision.
