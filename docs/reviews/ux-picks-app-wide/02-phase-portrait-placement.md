# Phase portrait placement reasoning (input to the conversion guide)

Rule (Taylor's): what the learner changes while watching the graph goes on the board; a choice with a few named options goes on the board; a setting changed once goes to Orodja.

- **System (`phase-system`, board choice).** Three named options that replace the whole picture; the learner switches between them while reading the portrait, so the choice sits next to the board.
- **Equilibrium (`phase-equilibrium`, board choice, locked unless pendulum).** Two named options that recentre the view; it is declared always and locked while the system has one equilibrium (the panel hides it there), so a frame can name it.
- **Matrix entries a to d (`phase-a`..`phase-d`, board ranges, locked unless linear).** They are changed while watching the trajectories and the matrix columns are already draggable handles on the board. Locked, not absent, for the nonlinear systems, where the panel hides them.
- **Seed count (`phase-seed-count`, tools count, section `seeds`).** Adding or removing a start point is a setup step, not something watched while it changes; it stays in Orodja next to the point list.
- **Zoom (`phase-zoom`, board range 0 to 6).** The Hartman-Grobman steps change it repeatedly while comparing the ring with its linearization, so it belongs with the board.
- **Time (`phase-time`, board range) with actions `play-pause` and `reset-time` (board).** Scrubbing and playing are the watching itself; the actions call the methods the playback buttons call, as the learner.

Not declared: the seed positions (`phase-seed-1`..`phase-seed-6`, point values dragged on the board or typed in the point list). The contract has no point-valued parameter kind.
