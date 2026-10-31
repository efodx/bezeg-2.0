# Projective conics: Slovenian term research

Date 2026-10-31. Method: grep of `src/localization/sl.ts`; web search plus fetches of FMF Ljubljana APG exercise sheet (apg_i16_1.pdf, text extracted) and sl.wikipedia "Projektivna geometrija". Search tooling was weak: no lecture notes, theses or textbooks were read in full, and Termania was not reached.

Sources: A = https://ucilnica2122.fmf.uni-lj.si/pluginfile.php/1299/course/section/235/apg_i16_1.pdf ; W = https://sl.wikipedia.org/wiki/Projektivna_geometrija

| English | Slovenian decision | Basis |
| --- | --- | --- |
| cross-ratio | dvorazmerje | A: "dvorazmerje D(A, B, C, D)"; W: dvorazmerje as invariant of projective maps |
| harmonic quadruple | harmonična četverka | A: "tocke A, B, C in D harmonicna cetverka" |
| homogeneous coordinates | homogene koordinate | W: "homogenimi koordinatami"; sl.ts has no hit for "homogen" in the grep above, so no conflict found (verify rational-curve lesson text) |
| point at infinity | točka v neskončnosti (gloss: neskončno oddaljena točka once) | A: "tocka v neskoncnosti"; W: "točko v neskončnosti". Both sources contradict the spec proposal "neskončno oddaljena"; use the sourced form |
| line at infinity | premica v neskončnosti | follows the point choice; W only says "premico točk v neskončnosti", A not seen |
| pole and polar | pol in polara | spec cites FMF c110; not confirmed in A or W. English gloss on first mention |
| Pascal's theorem | Pascalov izrek | spec cites c110; sl.wikipedia page URL 404 (not verified directly) |
| Pappus's theorem | Pappusov izrek | convention for Latinised Greek names; "Papusov" not checked. Gloss "Pappus" in Latin letters on first mention |
| conic | stožnica | A: "izrojena stožnica"; spec cites c110/c114 and matura |
| degenerate conic | izrojena stožnica; "par premic" for the two-line case | A: "je izrojena stoznica v P(R3)". "razpadla" not found anywhere; drop it |
| tangent to a conic | tangenta stožnice | sl.ts uses "tangenta" (derivative lessons); spec cites matura §4.11 |
| central projection | središčna projekcija | spec proposal; W does not use it ("projeciranje"); A uses "perspektivnost" per spec c110 note. Use "središčna projekcija" in prose, mention "perspektivnost" only if a lesson needs the projective-map sense |
| pencil of lines | snop premic (not "šop") | W: "snop vzporednih premic". "šop" appeared only in a COBISS heading "šop stožnic" via search snippet. Conflict: pick "snop premic" (W, wiki-level) and flag |
| weight | utež | sl.ts: "weights": "Uteži", "Uteži kontrolnih točk" |

## Pole clash
sl.ts has no key for a function pole; family 2 prose uses "pol" (pole of a rational function). "pol" of a conic clashes in the same app. Disambiguate by always writing "pol in polara glede na stožnico" together, and "pol funkcije" / "polara" never alone; do not use bare "pol" in conic prose without "polara" nearby. Alternative: use "pol (točka)" with "polara (premica)". Confirm the same wording in en.ts ("pole" has the same clash).

## Not verified
- FMF c110/c114 topic lists themselves (spec cites them; I only read the exercise sheet A).
- "pol in polara", "Pascalov izrek", "Pappusov/Papusov", "šop vs snop" in UL teaching text.
- "premica v neskončnosti" in a UL source.
- Termania and Slovenian textbooks.
- Whether sl.ts already contains "homogene koordinate" (grep for "homogen" printed nothing).
