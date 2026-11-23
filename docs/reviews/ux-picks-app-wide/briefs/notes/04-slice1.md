# 04 slice 1 note

Done: layout API (reserve, defaultFolded, budget, expanded), CardShell headActions, useMeasuredCards live/measureLive. Checks: just unit src/workspace, tsc, eslint, just build passed.

Presenter needs: `data-card-body` is now on the CardShell body (live measure reads it); measureLive takes the shown card root. DOM order in head changed to grip, title, actions, fold, reset (reset used to precede fold).
