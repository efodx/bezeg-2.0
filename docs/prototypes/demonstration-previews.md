# Demonstration preview comparison

Accepted on 2026-10-08: starting cards A and full-catalog A. Three large graph preview cards introduce the starting demonstrations; six smaller family illustrations add visual variety to the complete catalog without adding a thumbnail to every link.

The full throwaway comparison is preserved on `codex/demonstration-preview-prototypes` at `bc87654`, including the original starting comparison at `1a9f296`. To revisit it, use that branch, run `npm start`, and open `/bezeg/demonstrations?prototype=previews&variant=A`. The floating arrows compare illustrated family panels, per-demonstration thumbnails, and one-family-at-a-time browsing. Production no longer interprets those query parameters or includes comparison code.

Production scope and verification are in [Dedicated demonstrations view](../specs/demonstrations-view.md). Versioned SVG illustrations are regenerated with `node scripts/generate-demonstration-previews.cjs`. Starting drawings use the existing default control/generating points with selected constructions visible; family drawings depict mathematical concepts rather than specific default scenes.
