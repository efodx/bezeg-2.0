# Fourier series: Slovenian term research

Date 2026-10-31. Method: grep of `src/localization/sl.ts`; web search; text extraction of FMF Ljubljana exercise sheet (ucilnica2122, resource id 47673) and a COBISS catalogue snippet. Search tooling was weak: few Slovenian lecture notes or theses were read.

Sources: F = https://ucilnica2122.fmf.uni-lj.si/mod/resource/view.php?id=47673 ; K = COBISS record of S. Kerševan, "Gibbsov fenomen" (2019, UL FMF diploma seminar; mentor O. Dragičević) as reported by search.

| English | Slovenian decision | Basis |
| --- | --- | --- |
| Fourier series | Fourierova vrsta | F: "Fourierove vrste", "Fourierovo vrsto". (One typo "Fourierjevo" appears; ignore.) sl.ts uses "vrsta" for series |
| partial sum | delna vsota | grep for "delna vsota" in sl.ts found no hit; spec says family 2 uses it, recheck there. Standard wording; gloss not needed |
| Fourier coefficient | Fourierov koeficient | standard; F snippet only confirms formulas for a0, an, bn; the exact phrase not seen. Verify |
| spectrum bar chart | amplitudni spekter (stolpci) | standard; no Slovenian source found. A thesis (Javornik 2007, "spekter zvoka") uses "spekter" |
| Gibbs phenomenon | Gibbsov pojav | CONFLICT: K title uses "Gibbsov fenomen" (UL teaching). Spec proposed "pojav". Recommend "Gibbsov pojav" with "(Gibbsov fenomen)" gloss once, since "fenomen" is the UL thesis term; owner may prefer "fenomen" |
| pointwise / uniform convergence | točkovna / enakomerna konvergenca | sl.ts: "uniform_convergence": "Enakomerna konvergenca", "Točkovna napaka" |
| epicycle | epicikel, with prose "vrteči se krogi" | no Slovenian source found; established loanword, descriptive phrase added |
| parametrization | parametrizacija | sl.ts: "parametrization": "Parametrizacija" |
| square wave | pravokotni val | no source; sl.ts does not use "val" for waves (not checked). Alternative "pravokotni signal". Gloss in English once |
| sawtooth wave | žagasti val | same; "žagasta funkcija" not confirmed |
| jump discontinuity | skok (nezveznost) | sl.ts: "continuity_jump": "Skok |3 − 2a|", "brez skoka" |

## Not verified
- Termania entries and Slovenian textbooks.
- "Fourierov koeficient", "amplitudni spekter", "žagasti", "pravokotni val" in any UL source.
- Whether sl.ts uses "val" for sine graphs (spec claims so; not grepped).
- Body text of Kerševan's thesis (only the title was seen).
