# f1-isometry-02 math review
`just unit src/isometry` passed. Frieze closure, signature reading, IUC map, and 7/10/16 oracle cleared.
Findings (low): rosette mirror images never compared to an independent formula (rosette.test.ts:36-45), so sign-mutations of the mirror row survive; the brute oracle's 7 classes reuse the signature definition (frieze.test.ts:48-53), not an independent conjugacy test; friezeCopies images are not confined to [kL,(k+1)L), so window edges can be uncovered (frieze.ts:156-162); rational-L test uses only L=3/2 (frieze.test.ts:121).
