# bezier-pilot (lesson script r0)

**Naslov:** Bézierjeva krivulja: od točk do oblike

**Uvod (viden na prvem koraku, prvem okvirju):** Kontrolne točke določajo krivuljo; pri njihovem premiku se nekatere geometrijske lastnosti ohranijo.

## Korak 1/6: Osnovna ideja

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Osnovna ideja

[besedilo] Bézierjeva krivulja je določena s kontrolnimi točkami. Točke niso nujno na krivulji; vplivajo na njeno obliko.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Osnovna ideja

[navodilo za opazovanje] Določi začetno in končno točko krivulje.

[skrito pod 'Kaj bi morali opaziti'] Krivulja se začne pri \(P_0\) in konča pri \(P_3\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Na grafu je simetrična kubična Bézierova krivulja v obliki loka s štirimi kontrolnimi točkami. Poligona ni; gre za začetni prizor.*

## Korak 2/6: Kontrolni poligon in ovojnica

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kontrolni poligon in ovojnica

[besedilo] Kontrolni poligon poveže \(P_0\), \(P_1\), \(P_2\), \(P_3\). Pri \(0\le t\le 1\) so Bernsteinove uteži nenegativne in seštevek je 1, zato krivulja ostane v konveksni ovojnici.

[formula/oznake] \[B([0,1])\subseteq\operatorname{conv}\{P_0,\ldots,P_n\}\]

[formula/oznake] Konveksna ovojnica je najmanjša konveksna množica, ki vsebuje kontrolne točke.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kontrolni poligon in ovojnica

[navodilo za opazovanje] Preveri, ali krivulja zapusti označeno konveksno ovojnico.

[skrito pod 'Kaj bi morali opaziti'] Ne; pri običajnem parametru ostane znotraj konveksne ovojnice.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Na krivuljo se pokažeta kontrolni poligon (lomljena črta skozi štiri točke) in konveksna ovojnica (pravokotnik, ki obdaja točke). Krivulja ostane enaka.*

## Korak 3/6: Krajišči

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krajišči

[besedilo] Pri \(t=0\) je teža \(P_0\) enaka 1, pri \(t=1\) pa je teža \(P_3\) enaka 1. Drugi kontrolni točki vplivata na potek, ne pa na krajišči.

[formula/oznake] \[B(0)=P_0,\qquad B(1)=P_n\]

[formula/oznake] Začetna in končna točka krivulje sta prvi in zadnji kontrolni točki.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krajišči

[navodilo za opazovanje] Premakni \(P_1\) ali \(P_2\) ter opiši, kaj se spremeni in kaj ostane nespremenjeno.

[skrito pod 'Kaj bi morali opaziti'] Oblika krivulje se spremeni, krajišči pri \(P_0\) in \(P_3\) pa ostaneta enaki.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja je ista kot prej, viden je le kontrolni poligon (ovojnice ni). Vidi se, da se krivulja začne in konča v prvi in zadnji točki, notranji dve točki pa ležita zunaj nje.*

## Korak 4/6: Izračun pri \(t=1/2\)

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Izračun pri \(t=1/2\)

[besedilo] Za točke \((-3,-2)\), \((-3,2)\), \((3,2)\), \((3,-2)\) je \[ \begin{aligned}B(1/2)&=\tfrac18\bigl((-3,-2)+3(-3,2)\\&\qquad{}+3(3,2)+(3,-2)\bigr)\\&=\tfrac18(0,8)=(0,1)\end{aligned} \] To je utežena vsota vseh štirih kontrolnih točk z utežmi \(1/8,\,3/8,\,3/8,\,1/8\), ne njihovo aritmetično povprečje \((0,0)\).

[formula/oznake] \[B(t)=\sum_{i=0}^{n}\binom{n}{i}(1-t)^{n-i}t^iP_i,\qquad 0\le t\le1\]

[formula/oznake] \(P_i\) so kontrolne točke, \(n\) je stopnja, \(t\) pa parameter od 0 do 1.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Izračun pri \(t=1/2\)

[izračunani primer: Kubična krivulja pri \(t=1/2\)]
[izračun] \[P_0=(-3,-2),\;P_1=(-3,2),\;P_2=(3,2),\;P_3=(3,-2)\]
[rezultat] \[B(1/2)=\frac18(P_0+3P_1+3P_2+P_3)=\frac18(0,8)=(0,1)\]
[preverjanje] Neodvisen izračun potrdi rezultat; premik kontrolne točke spremeni tudi vrednost v tej točki.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Izračun pri \(t=1/2\)

[navodilo za opazovanje] Preveri, ali izračunana točka leži v konveksni ovojnici kontrolnih točk.

[skrito pod 'Kaj bi morali opaziti'] Točka je na krivulji in znotraj konveksne ovojnice.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja s poligonom in ovojnico; na krivulji je označena ena točka pri parametru \(t=\tfrac12\), na sredini loka, v \((0,1)\).*

## Korak 5/6: Vpliv premika

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Vpliv premika

[besedilo] Nesimetrična krivulja z \((-3,-2)\), \((-1,3)\), \((2,-1)\), \((3,2)\) ima pri \(t=1/2\) točko \((3/8,3/4)\) z istimi utežmi kot prej. Premik notranje kontrolne točke spremeni krivuljo, poligon in ovojnico; krajišči ostaneta.

[formula/oznake] \[B(t)=\sum_{i=0}^{n}\binom{n}{i}(1-t)^{n-i}t^iP_i,\qquad 0\le t\le1\]

[formula/oznake] \(P_i\) so kontrolne točke, \(n\) je stopnja, \(t\) pa parameter od 0 do 1.

[formula/oznake] \[B([0,1])\subseteq\operatorname{conv}\{P_0,\ldots,P_n\}\]

[formula/oznake] Konveksna ovojnica je najmanjša konveksna množica, ki vsebuje kontrolne točke.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Vpliv premika

[izračunani primer: Nesimetrična kubična krivulja pri \(t=1/2\)]
[izračun] \[P_0=(-3,-2),\;P_1=(-1,3),\;P_2=(2,-1),\;P_3=(3,2)\]
[rezultat] \[B(1/2)=\frac18(P_0+3P_1+3P_2+P_3)=\frac18(3,6)=(3/8,3/4)\]
[preverjanje] Uteži \(1/8,\,3/8,\,3/8,\,1/8\) so enake kot prej; drugačen rezultat je posledica drugačnih kontrolnih točk.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Vpliv premika

[navodilo za opazovanje] Opiši, kako se sprememba položaja kontrolne točke odrazi na krivulji.

[skrito pod 'Kaj bi morali opaziti'] Krivulja ostane povezana s krajiščema, njen potek pa sledi novi ovojnici.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja je zdaj nesimetrična (drugačne kontrolne točke); poligon in ovojnica sta vidna, označena je točka pri \(t=\tfrac12\) s koordinatama \((3/8,3/4)\).*

## Korak 6/6: Samostojna analiza

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Samostojna analiza

[besedilo] V poljubni nastavitvi so vidni krajišči, konveksna ovojnica in vpliv kontrolnih točk na obliko krivulje.

[formula/oznake] \[B(0)=P_0,\qquad B(1)=P_n\]

[formula/oznake] Začetna in končna točka krivulje sta prvi in zadnji kontrolni točki.

[formula/oznake] \[B([0,1])\subseteq\operatorname{conv}\{P_0,\ldots,P_n\}\]

[formula/oznake] Konveksna ovojnica je najmanjša konveksna množica, ki vsebuje kontrolne točke.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Samostojna analiza

[navodilo za opazovanje] Izberi lastnost, ki jo boš preveril z novo konfiguracijo kontrolnih točk.

[skrito pod 'Kaj bi morali opaziti'] Različne kontrolne točke dajo različne krivulje, vendar veljajo iste osnovne lastnosti.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Vrne se privzeta kubična krivulja (druga kot prej) s poligonom in ovojnico; vse je prosto za premikanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
