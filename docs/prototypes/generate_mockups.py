"""Generate static SVG visuals for the Bezeg tools redesign proposal."""

from html import escape
from pathlib import Path


OUT = Path(__file__).parent
INK = "#263127"
MUTED = "#667064"
GREEN = "#3B6704"
GREEN_DARK = "#264901"
CREAM = "#F7F5E7"
PAPER = "#FFFEFA"
LINE = "#E3E5D7"
BLUE = "#4363D8"
TEAL = "#55988C"
GOLD = "#D99125"


def rect(x, y, w, h, fill, rx=0, stroke="none", sw=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def text(x, y, value, size=14, color=INK, weight=400, anchor="start"):
    return f'<text x="{x}" y="{y}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{escape(str(value))}</text>'


def line(x1, y1, x2, y2, color=LINE, sw=1, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"{d}/>'


def circle(cx, cy, r, fill, stroke="none", sw=1):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def button(x, y, w, label, primary=False, h=38):
    fill = GREEN if primary else PAPER
    color = PAPER if primary else INK
    border = GREEN if primary else LINE
    return rect(x, y, w, h, fill, 9, border) + text(x + w / 2, y + h / 2 + 5, label, 13, color, 600, "middle")


def toggle(x, y, label, checked=False):
    track = GREEN if checked else "#D6DCCB"
    knob_x = x + (26 if checked else 12)
    return rect(x, y, 38, 22, track, 11) + circle(knob_x, y + 11, 8, PAPER, "#FFFFFF", 1) + text(x + 50, y + 16, label, 13, INK, 500)


def slider(x, y, label, value, pct=50, width=250):
    knob = x + width * pct / 100
    return text(x, y, label, 13, MUTED, 500) + text(x + width, y, value, 13, INK, 600, "end") + line(x, y + 22, x + width, y + 22, "#D9DECF", 5) + line(x, y + 22, knob, y + 22, GREEN, 5) + circle(knob, y + 22, 8, GREEN, PAPER, 2)


def flower(cx, cy, scale=1):
    parts = []
    for dx, dy in [(0, -7), (5, -5), (7, 0), (5, 5), (0, 7), (-5, 5), (-7, 0), (-5, -5)]:
        parts.append(circle(cx + dx * scale, cy + dy * scale, 2.4 * scale, "#A8B36A"))
    parts.append(circle(cx, cy, 2.5 * scale, GREEN))
    return "".join(parts)


def header(compact=False):
    parts = [rect(0, 0, 1440, 72, PAPER), line(0, 71, 1440, 71, LINE)]
    parts += [flower(36, 35, 1.05), text(56, 42, "Bezeg", 21, GREEN_DARK, 700)]
    nav = [(300, "Bernstein"), (405, "Bézierjeve krivulje"), (590, "Racionalne"), (730, "Zlepki"), (825, "PH krivulje"), (950, "Parametrizacije")]
    for x, label in nav:
        active = label == "Bézierjeve krivulje"
        if active:
            parts.append(rect(x - 12, 14, 168, 44, "#EEF1E3", 12))
        parts.append(text(x, 42, label, 13, GREEN_DARK if active else MUTED, 600 if active else 500))
    parts += [circle(1300, 35, 17, CREAM), text(1300, 40, "?", 15, GREEN_DARK, 700, "middle"), text(1332, 40, "Pomoč", 13, MUTED, 500)]
    return "".join(parts)


def graph(x, y, w, h, compact=False, construction=False):
    p = [rect(x, y, w, h, PAPER, 14, LINE)]
    p.append(f'<defs><clipPath id="plot"><rect x="{x+12}" y="{y+12}" width="{w-24}" height="{h-24}" rx="10"/></clipPath></defs>')
    p.append(f'<g clip-path="url(#plot)">')
    for i in range(1, 8):
        gx = x + w * i / 8
        p.append(line(gx, y + 1, gx, y + h - 1, "#ECEDE6", 1))
    for i in range(1, 7):
        gy = y + h * i / 7
        p.append(line(x + 1, gy, x + w - 1, gy, "#ECEDE6", 1))
    ax = x + w * .51
    ay = y + h * .61
    p.append(line(ax, y + 8, ax, y + h - 8, "#7C8277", 1.6))
    p.append(line(x + 8, ay, x + w - 8, ay, "#7C8277", 1.6))
    scale = min(w, h)
    p0 = (x + w * .18, y + h * .84)
    p1 = (x + w * .26, y + h * .28)
    p2 = (x + w * .78, y + h * .28)
    p3 = (x + w * .85, y + h * .76)
    p.append(f'<path d="M {p0[0]} {p0[1]} L {p1[0]} {p1[1]} L {p2[0]} {p2[1]} L {p3[0]} {p3[1]}" fill="none" stroke="{TEAL}" stroke-width="2.5" stroke-dasharray="7 6"/>')
    p.append(f'<path d="M {p0[0]} C {x+w*.4} {y+h*.18}, {x+w*.67} {y+h*.22}, {p3[0]} {p3[1]}" fill="none" stroke="{BLUE}" stroke-width="4" stroke-linecap="round"/>')
    if construction:
        q0 = (x + w*.37, y+h*.49)
        q1 = (x + w*.64, y+h*.49)
        p.append(line(*q0, *q1, GOLD, 3, "7 5"))
        p.append(circle(q0[0], q0[1], 7, GOLD, PAPER, 2))
        p.append(circle(q1[0], q1[1], 7, GOLD, PAPER, 2))
        p.append(circle(ax, y+h*.49, 8, "#7B3FB2", PAPER, 2))
    for i, (px, py) in enumerate([p0, p1, p2, p3]):
        p.append(circle(px, py, 8 if not compact else 7, GOLD if i in (0, 3) else BLUE, PAPER, 2))
        if not compact:
            offset = -14 if i in (1, 2) else 22
            p.append(text(px + 8, py + offset, f"P{i}", 13, INK, 600))
    p.append('</g>')
    p.append(text(x + 18, y + h - 18, "Povleci točke in opazuj spremembo krivulje", 12, MUTED, 500))
    p += [rect(x + w - 105, y + 16, 88, 31, PAPER, 8, LINE), text(x + w - 61, y + 36, "−   100%   +", 12, INK, 600, "middle")]
    return "".join(p)


def root(width=1440, height=900, title="Bezeg — predlog preureditve orodij"):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">', '<rect width="100%" height="100%" fill="#F4F5EE"/>', text(16, height - 10, title, 1, "#F4F5EE")]


def variant_a():
    p = root()
    p += [header(), rect(0, 72, 224, 828, "#F8F7EF"), line(223, 72, 223, 900, LINE)]
    p += [text(26, 112, "RAZISKOVANJE", 11, MUTED, 700), text(26, 153, "Teme", 16, INK, 700)]
    nav_items = [("Bernsteinovi polinomi", 196), ("Bézierjeve krivulje", 244), ("Racionalne krivulje", 292), ("Zlepki", 340), ("PH krivulje", 388), ("Parametrizacije", 436)]
    for label, yy in nav_items:
        if label == "Bézierjeve krivulje":
            p.append(rect(14, yy-27, 195, 38, "#E8EEDD", 9))
        p.append(text(29, yy, label, 13, GREEN_DARK if label == "Bézierjeve krivulje" else MUTED, 600 if label == "Bézierjeve krivulje" else 500))
    p += [line(24, 478, 200, 478), text(26, 514, "MOJI PRIMERI", 11, MUTED, 700), text(28, 552, "＋  Shrani trenutni primer", 12, GREEN, 600)]
    p += [text(250, 105, "Bézierjeva krivulja", 23, INK, 700), text(250, 132, "Uredi kontrolne točke in takoj primerjaj obliko.", 13, MUTED, 400)]
    p += [rect(248, 150, 824, 48, PAPER, 11, LINE)]
    p += [text(265, 180, "Način", 12, MUTED, 600), rect(315, 159, 96, 30, GREEN, 8), text(363, 179, "Izberi", 12, PAPER, 600, "middle"), rect(416, 159, 112, 30, PAPER, 8, LINE), text(472, 179, "Premakni", 12, INK, 500, "middle"), rect(533, 159, 108, 30, PAPER, 8, LINE), text(587, 179, "Dodaj točko", 12, INK, 500, "middle"), rect(646, 159, 110, 30, PAPER, 8, LINE), text(701, 179, "Izbriši", 12, INK, 500, "middle"), text(1047, 180, "Namig: klikni krivuljo za izbor", 11, MUTED, 500, "end")]
    p.append(graph(248, 210, 824, 638))
    p += [rect(1090, 86, 330, 762, PAPER, 14, LINE), text(1114, 122, "Izbrana krivulja", 18, INK, 700), rect(1347, 101, 50, 26, "#EEF1E3", 13), text(1372, 119, "Izbrano", 10, GREEN_DARK, 700, "middle")]
    p += [line(1110, 143, 1400, 143), rect(1109, 158, 291, 36, "#EEF1E3", 9)]
    for i, label in enumerate(["Uredi", "Prikaz", "Shrani"]):
        p.append(text(1158 + i*94, 181, label, 12, GREEN_DARK if i == 0 else MUTED, 700 if i == 0 else 500, "middle"))
    p += [text(1115, 226, "Način urejanja", 12, MUTED, 600), rect(1110, 239, 288, 42, PAPER, 9, LINE)]
    p += [text(1125, 266, "Operiraj s krivuljo", 13, INK, 600), text(1380, 266, "⌄", 15, MUTED, 600, "end")]
    p += [line(1110, 294, 1400, 294), text(1115, 321, "Gradniki", 14, INK, 700), toggle(1117, 337, "Kontrolne točke", True), toggle(1117, 373, "Kontrolni poligon"), toggle(1117, 409, "Konveksna ovojnica")]
    p += [line(1110, 447, 1400, 447), text(1115, 475, "Konstrukcija", 14, INK, 700), slider(1115, 503, "Parameter t", "0,50", 50, 260), text(1115, 558, "Odsek označi z drsnikom t.", 12, MUTED, 400)]
    p += [line(1110, 579, 1400, 579), text(1115, 607, "Operacije", 14, INK, 700), button(1115, 625, 133, "Razdeli", True), button(1260, 625, 138, "Dvigni stopnjo"), button(1115, 672, 133, "Ekstrapoliraj"), button(1260, 672, 138, "Skrči")]
    p += [line(1110, 722, 1400, 722), text(1115, 749, "Spremembe niso shranjene", 11, MUTED, 500), button(1115, 766, 150, "Shrani primer", True), button(1274, 766, 124, "Izvozi sliko")]
    p.append('</svg>')
    return "".join(map(str, p))


def variant_b():
    p = root()
    p += [header(), rect(0, 72, 248, 828, "#F8F7EF"), line(247, 72, 247, 900, LINE)]
    p += [text(24, 111, "UČNI NAČRT", 11, MUTED, 700), text(24, 151, "Bézierjeva krivulja", 17, INK, 700), text(24, 183, "3 kratki koraki", 12, MUTED, 500)]
    for i, (yy, title, sub) in enumerate([(235,"Spoznaj krivuljo","Kontrolne točke"),(310,"Premakni točko","Kaj se spremeni?"),(385,"Primerjaj oblike","Shrani primer")]):
        if i == 1:
            p.append(rect(14, yy-31, 220, 62, "#E8EEDD", 10))
        p.append(circle(35, yy-4, 12, GREEN if i == 1 else PAPER, GREEN if i == 1 else LINE, 1.5))
        p.append(text(35, yy, str(i+1), 11, PAPER if i == 1 else MUTED, 700, "middle"))
        p.append(text(58, yy-6, title, 13, INK, 600))
        p.append(text(58, yy+13, sub, 11, MUTED, 400))
    p += [line(24, 447, 221, 447), text(24, 482, "PREDSTAVITEV", 11, MUTED, 700), text(24, 515, "Ocenjen čas: 2 min", 12, INK, 500)]
    p += [text(273, 105, "2. Premakni kontrolno točko", 22, INK, 700), text(273, 132, "Najprej spremeni geometrijo; razlaga ostane ob grafu.", 13, MUTED, 400)]
    p += [rect(270, 151, 788, 48, PAPER, 11, LINE), text(290, 181, "Krivulja s 4 kontrolnimi točkami", 13, INK, 600), text(1037, 181, "Privzeti primer   ⌄", 12, MUTED, 500, "end")]
    p.append(graph(270, 211, 788, 620, construction=True))
    p += [rect(1077, 86, 343, 745, PAPER, 14, LINE), text(1101, 125, "Poskusi to", 18, GREEN_DARK, 700), text(1101, 158, "Povleci modro kontrolno točko.", 14, INK, 600), text(1101, 184, "Krivulja se približa izbrani točki,", 12, MUTED, 400), text(1101, 202, "vendar praviloma ne gre skozi njo.", 12, MUTED, 400)]
    p += [line(1101, 230, 1396, 230), text(1101, 262, "Opazuj", 13, INK, 700), toggle(1105, 278, "Kontrolni poligon", True), toggle(1105, 314, "Oznake točk", True)]
    p += [line(1101, 354, 1396, 354), text(1101, 383, "Tvoj naslednji poskus", 13, INK, 700), text(1101, 410, "1. Premakni P₁ navzgor.", 12, MUTED, 500), text(1101, 432, "2. Primerjaj ukrivljenost.", 12, MUTED, 500)]
    p += [line(1101, 458, 1396, 458), slider(1101, 489, "Razdelitvena točka t", "0,50", 50, 260), button(1101, 539, 138, "Razdeli", True), button(1250, 539, 146, "Pokaži korake")]
    p += [rect(1101, 608, 295, 85, "#F3F5EC", 10), text(1117, 635, "Zakaj je to uporabno?", 12, GREEN_DARK, 700), text(1117, 660, "Ista krivulja pokaže vpliv točk in", 11, MUTED, 400), text(1117, 678, "parametra, ne da bi izgubili kontekst.", 11, MUTED, 400)]
    p += [button(1101, 756, 140, "Nazaj", False), button(1250, 756, 146, "Naslednji korak", True)]
    p.append('</svg>')
    return "".join(map(str, p))


def variant_c():
    p = root()
    p += [header(), text(28, 104, "Bézierjeva krivulja", 20, INK, 700), text(28, 127, "Predstavitev", 12, MUTED, 500)]
    p.append(graph(24, 143, 1392, 705))
    p += [rect(42, 160, 54, 188, PAPER, 14, LINE), circle(69, 190, 17, "#EEF1E3"), text(69, 195, "↖", 17, GREEN_DARK, 700, "middle"), line(52, 219, 86, 219), circle(69, 249, 17, PAPER, LINE), text(69, 254, "＋", 16, MUTED, 600, "middle"), circle(69, 306, 17, PAPER, LINE), text(69, 311, "−", 18, MUTED, 600, "middle")]
    p += [rect(1191, 92, 210, 36, PAPER, 10, LINE), text(1208, 116, "Nastavitve", 12, INK, 600), text(1381, 116, "☰", 16, GREEN_DARK, 600, "end")]
    p += [rect(280, 700, 880, 128, "#FFFEFA", 16, LINE), text(304, 731, "Urejanje krivulje", 15, INK, 700), text(1133, 731, "Pokaži vse nastavitve", 12, GREEN, 600, "end"), line(304, 746, 1136, 746)]
    p += [text(304, 775, "Način", 11, MUTED, 600), rect(352, 757, 82, 31, GREEN, 8), text(393, 778, "Izberi", 12, PAPER, 600, "middle"), rect(440, 757, 111, 31, PAPER, 8, LINE), text(495, 778, "Premakni", 12, INK, 500, "middle"), rect(557, 757, 108, 31, PAPER, 8, LINE), text(611, 778, "Dodaj", 12, INK, 500, "middle"), slider(700, 770, "Parameter t", "0,50", 50, 250), button(984, 757, 138, "Razdeli", True)]
    p += [rect(1220, 792, 180, 36, GREEN_DARK, 10), text(1310, 816, "Predstavitev je vklopljena", 11, PAPER, 600, "middle")]
    p.append('</svg>')
    return "".join(map(str, p))


def mobile():
    p = root(390, 844, "Bezeg — mobilni predlog")
    p += [rect(0, 0, 390, 60, PAPER), line(0, 59, 390, 59, LINE), flower(27, 30, .9), text(46, 37, "Bezeg", 18, GREEN_DARK, 700), text(357, 36, "☰", 22, GREEN_DARK, 600, "middle")]
    p += [text(16, 88, "Bézierjeva krivulja", 18, INK, 700), text(16, 109, "Privzeti primer  ·  4 točke", 11, MUTED, 500)]
    p.append(graph(10, 122, 370, 390, compact=True))
    p += [rect(0, 524, 390, 260, PAPER, 18, LINE), line(0, 524, 390, 524, LINE)]
    p += [text(18, 552, "Izbrana krivulja", 15, INK, 700), text(370, 552, "⌃", 18, MUTED, 600, "end")]
    p += [rect(15, 566, 360, 36, "#EEF1E3", 9), text(74, 590, "Uredi", 12, GREEN_DARK, 700, "middle"), text(195, 590, "Prikaz", 12, MUTED, 500, "middle"), text(317, 590, "Shrani", 12, MUTED, 500, "middle")]
    p += [text(18, 628, "Način urejanja", 11, MUTED, 600), rect(18, 638, 354, 36, PAPER, 8, LINE), text(32, 662, "Premakni kontrolne točke", 12, INK, 500), text(356, 662, "⌄", 14, MUTED, 600, "end")]
    p += [toggle(18, 688, "Kontrolne točke", True), toggle(197, 688, "Kontrolni poligon")]
    p += [rect(14, 730, 362, 44, "#EEF1E3", 10), text(195, 758, "＋  Dodaj točko", 13, GREEN_DARK, 700, "middle")]
    p += [rect(0, 784, 390, 60, PAPER), line(0, 784, 390, 784, LINE)]
    for x, icon, label in [(49,"⌂","Graf"),(146,"✥","Uredi"),(244,"◌","Prikaz"),(341,"▣","Primeri")]:
        p.append(text(x, 808, icon, 18, GREEN_DARK if label == "Graf" else MUTED, 600, "middle"))
        p.append(text(x, 831, label, 10, GREEN_DARK if label == "Graf" else MUTED, 500, "middle"))
    p.append('</svg>')
    return "".join(map(str, p))


for filename, image in [("tools-redesign-a-inspector.svg", variant_a()), ("tools-redesign-b-guided.svg", variant_b()), ("tools-redesign-c-presentation.svg", variant_c()), ("tools-redesign-mobile.svg", mobile())]:
    (OUT / filename).write_text(image, encoding="utf-8")

