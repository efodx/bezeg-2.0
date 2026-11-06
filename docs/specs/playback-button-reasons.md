# Playback button reasons

Status: accepted by curves handler 73, 2026-11-06.

## Problem

Iteration graphs show three playback buttons: next step, play or pause, and reset. An unavailable button uses `aria-disabled`, so it keeps keyboard focus, but nothing says why it does not respond. The same markup is copied into 18 control files.

## Decision

One shared `PlaybackButtons` in `src/graphs/base/controls/` replaces the copies. Each button takes a `PlaybackBlock`, or nothing when it is available:

| Block | Meaning | Slovenian | English |
| --- | --- | --- | --- |
| `no-more-steps` | The iteration has ended or cannot advance | Ni več korakov. | There are no more steps. |
| `playing` | Stepping by hand waits for playback to stop | Med predvajanjem korak ni na voljo. Najprej pritisni Premor. | Not available during playback. Press Pause first. |
| `at-start` | There is nothing to reset | Prikaz je že na začetku. | Already at the start. |
| `no-run` | The current input gives nothing to step through | Trenutni podatki ne dajo korakov. | The current input gives no steps. |

The pure `playbackBlocks` derives the three blocks from `{ready, atStart, atEnd, playing, stepsWhilePlaying}`. A graph whose rule differs overrides a single block.

The reason reaches each kind of user:

- **Mouse:** the button's `title`.
- **Screen reader:** `aria-describedby` on the blocked button.
- **Keyboard and touch:** pressing a blocked button shows the reason in a polite status line under the buttons. It disappears when that button becomes available or an available button is pressed.

Alternatives rejected: native `disabled` drops focus when playback ends, and the graphs rely on keeping it. `title` alone reaches no touch or keyboard user.

## Acceptance

1. All 18 control files render `PlaybackButtons`; `grep -l 'data-action="play-pause"' -r src` lists only the shared component and tests.
2. In every file each button is unavailable in exactly the states it was before, and `data-action`, labels, group label and classes are unchanged.
3. A blocked button keeps focus, runs no action, and has `aria-disabled="true"`, a `title` and a description with the reason. An available button has none of these.
4. Pressing a blocked button shows its reason; the line clears as described above.
5. `sl.ts` and `en.ts` carry the four strings in lockstep; a language switch updates them.

No route, stored Preset or file format changes.
