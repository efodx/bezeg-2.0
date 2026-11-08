# 02 Inline math

Source: [browser annotations 3, 5 and 8](../../specs/annotated-ui-follow-up.md). Builds on the [shared chapter reader](../../specs/learn-improvements.md#3-shared-chapter-reader).

Inspect the MathJax output after typesetting in a browser that reproduces the scrollbar tracks. The chapter paragraphs and exploration prompts currently give each inline math container horizontal overflow. Make ordinary symbols, fractions, inequalities and coordinate tuples flow with prose. If an expression really exceeds the reading width, give it a readable layout or put it in an accessible display region that can scroll independently. Keep the notation, including tall glyphs and scripts, fully visible.

Verify the Bézier parameter paragraph, the inequality in annotation 5, and the B-splines blossoming passage. Cover 1440px and 390px, with 200% text on the narrow view and both languages. Check actual rendered math after typesetting. Ordinary inline math has no scrollbar, tall symbols are intact, and long display math remains reachable by keyboard and touch without widening the page. Run the existing lesson notation check if any prose moves between inline and display math.
