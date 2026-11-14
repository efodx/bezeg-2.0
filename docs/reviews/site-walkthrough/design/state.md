# State: site walkthrough, design session (package C)

Rewritten 2026-11-14 by handler 1.

## For the owner

**Ready to look at:** the mockup gallery, <http://desktop-a0j72sv.tail2032db.ts.net:4332/>. It is a standalone page, so there is no app base path.

**Choices only you can make.** Nothing is implemented until you pick; the recommended option is framed in green in the gallery.

| Item | Pick one | Recommended |
| --- | --- | --- |
| H02 pool | the nine positive references, or a wider pool | the nine |
| H02 label | "Izbor demonstracij", "Izbrane demonstracije", "Za pokušino" | "Izbor demonstracij" |
| H02 rotation | six at random per visit, one set per day, whole pool shuffled | six at random per visit |
| H03 carousel | A cards, B arrows on the preview, C only remove | A |
| H04 learning route | A two buttons, B two doors | A |
| L01 numbering | A none, B everywhere, C contents list only | B |
| L04 Back button | A outline, B sage tint, C quiet text | B |
| L05 botanicals strength | A as elsewhere, B calmer | A |
| P01 save dialog | A restyled dialog, B save inside the panel | A |
| P02 presets panel | adopt the proposed list panel or not; "prednastavitve" or "shranjena stanja" | adopt; wording open |
| G07 epicycles subject | Slovenia, treble clef, cat, elderflower blossom | yours; cat or Slovenia show the most |

## Where things are

- Proposal spec with draft acceptance criteria: `docs/specs/site-walkthrough-design.md` (status proposed; nothing recorded as decided).
- Queue: `docs/tasks/site-walkthrough/design.md`.
- Gallery source, scripts and images: `docs/reviews/site-walkthrough/design/` (`index.html`, `mockups.mjs`, `epicycles-subjects.html`, `epicycles-subjects.mjs`, `serve.mjs`, `img/`).
- No app code has been changed, committed or pushed.

## Running processes

- `node docs/reviews/site-walkthrough/design/serve.mjs 4332` serves the gallery on 127.0.0.1:4332.
- `tailscale serve --http=4332` publishes it. Remove with `tailscale serve --http=4332 off` when the gallery is replaced by an app preview.
- To re-render mockups: `just build`, `just preview 4332` (stop the gallery server first, or use another free port as the first argument), then `node docs/reviews/site-walkthrough/design/mockups.mjs <origin>`.

## Rule change received during the session

The intake session relayed a correction: the owner chooses design options; handlers do not decide them or implement recommendations ahead of his choice. This replaces "decide without asking" and step 3 of the original brief for this package. Routine engineering choices inside a picked option stay with the handler. No successor is launched while the work waits on the owner.

## Next, once picks arrive

1. Record each pick with its date in the spec and change its status.
2. Run queue slices 4 to 7 (L04, L01, L05, P01); they touch separate files.
3. Before the homepage slice, `git fetch` and confirm `polish` slice 3 (footer removal, header brand) is on `master`; on 2026-11-14 at `dbf3ff60` it was not.
4. L05 note: `.chapter-layout` spans the window, so mark the content column on an element bounding the contents list and the article with its margin notes.
5. This worktree's `node_modules` is a junction to the main checkout's.
