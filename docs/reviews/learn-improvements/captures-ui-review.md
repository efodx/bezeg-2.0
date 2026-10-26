# Capture UI review

No blocking UI or URL-contract issue found in the reader changes.

The six PNGs were opened and reviewed. Their subjects match their captions and alternatives: cubic controls, the quartic curve and interpolation, degree-two Bernstein functions, the shaded control-point hull, and the affine activity's starting cubic. The Slovenian math uses the lesson delimiter and decimal-comma convention correctly. The final image does not claim to show a transformed curve.

At `src/learning/ChapterPage.tsx:47-52`, each figure has a localized alternative and caption, intrinsic 720×440 dimensions, lazy loading, and asynchronous decoding. `src/learning/ChapterPage.css:43-46` lets the image use the reader column width without cropping; the declared aspect ratio matches the asset dimensions. The reading component contains no board mount or graph runtime. At `src/learning/ChapterPage.tsx:71-82`, the existing activity destination, launch state, return anchor, and click preparation remain intact around the new figure.

The added test in `src/learning/ChapterPage.test.tsx:48-73` checks six figures, asset names, dimensions, lazy loading, nonempty alternatives/captions, and English language switching. It gives useful coverage of the new rendering path, though it does not assert each activity-to-image pairing or decoded image success; the latter belongs in the handler's browser check.

Visual limitation: the screenshots themselves contain little explanatory text. In particular, the quartic captures do not visibly label `t = 1/2`, and the Bernstein plot has no basis-function legend. Captions supply the missing explanation, so this is not a correctness blocker, but visible labels would make the figures easier to interpret when projected or viewed apart from their surrounding copy. No responsive browser render was performed here; the handler owns that check.
