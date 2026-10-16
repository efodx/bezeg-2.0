---
status: accepted
---

# Study chapters and standalone exploration share Demonstrations

Accepted with the owner on 2026-10-16. Bezeg will provide readable Study chapters interleaved with graph activities, while its Demonstrations remain independently discoverable through the existing catalog. Chapter activities reference the same Demonstration identities, graph implementations, mathematical behavior, and controls as standalone exploration; the chapter adds a prepared scene, short context, and a return to reading. A chapter may use several Demonstrations, and a Demonstration may support several chapters. See the [specification and selected picture examples](../specs/standalone-learning.md).

We considered putting all explanation into the sequential Guided lesson frames, which would reuse the current reading mechanism but make substantial prose and revision access cumbersome. We also considered chapter-specific embedded graph implementations, which would make each chapter self-contained to build but duplicate mathematical, control, lifecycle, and export ownership. Shared Demonstrations keep graph improvements available to both entry points, at the cost of explicitly managing authored scenes, transient edits, navigation provenance, and return positions.

This extends the earlier exclusion of chapter navigation in the bounded guided-lesson work. ADR 0002's typed graph ownership and client-only content direction remain; existing Guided lessons retain their behavior. New chapter routes are additive, and Preset formats and standalone graph routes remain unchanged. The owner authorized the specification and reference pictures for publication; application implementation and content/classroom acceptance remain separate work.
