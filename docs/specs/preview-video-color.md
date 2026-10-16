# Preview video color consistency

The owner requested that all six animated demonstration previews match the warm background and color strength of their PNG posters. Current VP9 YUV420 encoding changes the background from RGB (255,253,245) to (253,252,243); browser presentation also needs verification.

## Acceptance criteria

- Fix the shared offline encoding pipeline and regenerate all six shipped clips from original captured frames, preserving scenes, timing, resolution, silence, and the existing 300 KiB per-clip budget.
- Preserve the poster background exactly in decoded video frames and avoid muted curve colors. Record the chosen pixel format and explicit color metadata; verify representative frame pixels against source frames.
- Keep PNG posters and application graph styles unchanged. Do not compensate with CSS filters or background overlays.
- Keep generated asset hashes and capture provenance consistent; add a focused encoder regression check at the real encoding seam.
- Verify production build and actual browser playback on the catalog, including background consistency beside a still preview; inspect the homepage reuse where available.

Related contract: [representative demonstration previews](representative-demonstration-previews.md).

## Implementation and verification — 2026-10-16

The shared encoder now uses VP9 RGB (`gbrp`, CRF 10) with explicit full-range RGB matrix, BT.709 primaries and sRGB transfer metadata. YUV444 still changed the background; lossless RGB exceeded the Bézier clip budget. The selected RGB setting preserves the background while keeping all clips below 300 KiB (largest: 292,962 bytes). No CSS compensation or graph-style changes were needed.

All six clips were regenerated from the original cached PNG frames, after checking their hashes against the original sample provenance. All 45 posters are byte-identical to the previous release. The manifest retains the original capture provenance and separately records re-encoding, input hashes, new output hashes and color metadata. Background samples from every one of the 576 source and decoded frames match RGB (255,253,245). Encoding also asserts this at generation time. A focused real-encoder regression uses the tracked Bézier poster as a fixture; the former YUV420 encoder returned (253,252,243).

The worker additionally compared all four corners of every frame (zero mismatches) and full decoded RGB frames against their PNG sources. On non-background source pixels, mean absolute channel error ranges from 0.146 to 0.692 across clips; maximum channel error ranges from 7 to 23. Fine edges remain lossy, but background color is exact and average foreground error stays below one RGB level.

Verification: TypeScript passed; the production build passed (existing Bootstrap Sass warnings); capture/encoder Node tests passed 10/10; manifest validation passed for 45 posters and six clips; all eight production motion browser tests passed, including all-six decode, looping, offscreen unload, reduced motion, 390px fallback/navigation, picker, delayed media, and homepage reuse. Handler focused visual validation on the local production catalog confirmed actual playback and consistent warm backgrounds beside static cards. This uses the smoke-tester skill's focused lane because only offline encoding and media changed; no app runtime or interaction code changed. Physical devices, projectors, and non-Chromium browsers were not tested; existing poster fallback remains in place.
