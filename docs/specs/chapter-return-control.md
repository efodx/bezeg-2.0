# Chapter return control in the demonstration header

## Problem and scope

After entering a graph from Learning and switching demonstrations, the retained
chapter return link appears as a default blue underlined anchor beside the header
buttons. Give this navigation link the shared workspace action appearance without
changing its semantic role, chapter destination, or visit lifetime.

## Acceptance

- Reproduce chapter entry followed by switching to `/bezier/decasteljau2`.
- The return link has the same typography, border, padding, and hover treatment as
  neighboring header actions in normal and Presentation mode.
- Keep a visible keyboard focus indicator and native link navigation to the
  originating chapter section.
- At 390px and with enlarged text, header actions wrap within the viewport and
  retain touch-sized targets. Check document overflow separately and report any
  existing inspector overflow; unrelated inspector sizing is outside this fix.
- Direct graph entry in a fresh visit does not acquire a chapter return link.

## Verification

Add a browser regression for the actual chapter-to-picker-to-demonstration path,
including computed appearance, destination, Presentation mode, and narrow layout.
Show the regression failing before the fix. Run the production build and focused
browser checks; use the smoke-tester workflow for independent interaction review.
No geometry, routes, or stored data change.

## Verification outcome — 2026-10-21

The regression first failed on the actual chapter-to-picker path: the anchor had
default blue text with no border or padding. The fix shares workspace action
styles with header links, including hover, Presentation mode, and responsive
rules, while retaining the native link and its originating-section destination.

Type checking, the production build, and all 20 standalone-learning and
library-picker browser checks passed. The regression verifies keyboard Enter
return, style parity, narrow header bounds, and fresh direct-entry absence.
Slovenian desktop, Presentation, and narrow enlarged-text screenshots were
reviewed independently.

At 390px and 200% root text size, an existing numeric inspector input makes the
document 395px wide on both fresh direct entry and the chapter-switch path.
The header actions fit within the viewport. Inspector overflow is deferred from
this bounded styling fix; full-page enlarged-text acceptance remains incomplete.
