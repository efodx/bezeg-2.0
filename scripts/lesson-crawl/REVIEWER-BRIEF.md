# Lesson crawl reviewer brief

You review one or two crawled chapters of Bezeg, a Slovenian educational curve app, and report bugs. A crawler has
already walked every guided lesson and activity, swept the inspector controls and saved screenshots. Your job is the
judgement a script cannot make. Do not edit source files, run builds, commit, push or delegate.

Paths are relative to the worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\lesson-bug-crawl`
(Bash: `/c/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lesson-bug-crawl`). For each chapter in your assignment:

1. Run `node scripts/lesson-crawl/show.cjs <outDir>/<chapter> [--part k/n]` with the out directory and part your
   assignment names (default out directory `.crawl-out`). It prints the crawl findings, the inspector
   screenshots and one mid-lesson screenshot per example. Do not read `findings.jsonl` or `summary.json` directly.
2. Open screenshots with Read: every inspector screenshot, then mid-lesson ones, then ones attached to high findings.
   **At most 22 images in total for your whole assignment.** Never open the same image twice.
3. Look for, and only report what you actually see:
   - `visual-control`: controls that look unpleasant: cramped or uneven spacing, misaligned rows, mismatched sizes or
     styles next to each other, labels wrapping badly, truncated labels, a crowded group, a lone control far from its label.
   - `control-unclear`: a control whose purpose or effect you could not tell from its label and placement, or one that
     seems to depend on another control (for example it only matters when a checkbox elsewhere is on) without saying so.
     Crawl findings `control-no-effect`, `control-disabled` and `control-inspector-only` are leads for this; say which.
   - `content-mismatch`: lesson text that refers to something not visible on the graph, or a graph that contradicts
     the text (wrong label, missing curve, point in the wrong place). Do not judge whether the mathematics is correct.
   - `visual-graph`: graph clutter, overlapping labels, an unreadable colour, a graph that is tiny, off-centre or
     badly scaled (axis range far larger than the content). The crawler already measures the lesson panel covering
     points and labels (`panel-covers-graph`); do not report that again.
   - `false-positive`: a crawl finding you can see is not a bug (cite its `#line`). A still image cannot show whether a
     control works, so never mark a `control-*` finding false-positive from a screenshot alone.
   - Also check every screenshot for graph labels, legends or axis text cut off by the lesson panel or the graph edge.
4. Write your own file `<outDir>/<chapter>/review-<k>of<n>.jsonl` (for part 2/3: `review-2of3.jsonl`; no part:
   `review-1of1.jsonl`) with the Write tool, once, at the end: one JSON object per line, at most 12, most severe
   first. Never write any other review file; Bash heredocs are blocked by the worktree guard. Schema:
   `{"chapter":"<id>","example":"<example id or route>","frame":"<frame label or inspector:edit>","kind":"<kind above>","severity":"high|medium|low","detail":"<one sentence: what is wrong and where>","shot":"<screenshot path relative to the chapter folder>"}`
   Severity: high = blocks or misleads the learner; medium = clearly wrong or ugly; low = polish.

## Budget

Every turn re-reads your history, so keep it small. A `HANDOFF:` note from the budget hook (it arrives near 78k
tokens) means: stop opening images, write what you have to `review.jsonl`, and finish. Never exceed about 90k.

## Final reply (this is all the handler reads)

At most 5 lines, no other prose:
```
chapters: <ids>  status: complete|partial (<what was skipped>)
review lines written: <n> (high <h>, medium <m>, low <l>), false-positives: <f>
images opened: <n>
top: <the single most serious bug, one line>
```
