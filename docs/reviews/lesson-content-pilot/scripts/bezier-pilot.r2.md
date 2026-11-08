# bezier-pilot (lesson script r2)

**Naslov:** Bézierjeva krivulja: kam sme in kam ne

**Uvod (viden na prvem koraku, prvem okvirju):** Črke v računalniških pisavah in poteze orodja »pero« v risalnih programih rišejo Bézierjeve krivulje. Vsaka ima štiri kontrolne točke. Skozi koliko od njih gre krivulja in kam sploh sme? Odgovor najdeš do konca lekcije.

## Korak 1/4: Krivulja in njene točke

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krivulja in njene točke

[besedilo] Na grafu je krivulja in njene štiri kontrolne točke, označene s \(p_0\), \(p_1\), \(p_2\), \(p_3\). Pri risanju črke ali oblike jih premikaš in krivulja se prilagaja. Kaj ji določa pot?

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krivulja in njene točke

[navodilo za opazovanje] Primi \(p_1\) in ga povleci daleč stran od krivulje. Ali ga krivulja doseže? Skozi katere točke gre krivulja ob vsakem premiku?

[skrito pod 'Kaj bi morali opaziti'] Krivulja se upogne proti \(p_1\), a ga ne doseže. Vedno pa se začne v \(p_0\) in konča v \(p_3\): prva in zadnja kontrolna točka sta na krivulji.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična kubična Bézierjeva krivulja v obliki loka s štirimi kontrolnimi točkami, označenimi \(p_0\) do \(p_3\). Poligona in ovojnice ni. Točke se lahko premikajo.*

## Korak 2/4: Kam krivulja ne more

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kam krivulja ne more

[besedilo] Zdaj vemo, da krivulja točk večinoma ne zadene. Kam pa sploh sme? Okoli štirih točk si zamisli napeto gumico. Lik, ki ga objame, je konveksna ovojnica, na grafu označena kot območje okoli točk. Kontrolni poligon je lomljena črta, ki točke povezuje po vrsti.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kam krivulja ne more

[navodilo za opazovanje] Začetne točke so oglišča pravokotnika, zato je tudi ovojnica pravokotnik. Premikaj \(p_1\) in \(p_2\) in poskusi krivuljo spraviti iz označenega območja. Ti uspe?

[skrito pod 'Kaj bi morali opaziti'] Ne. Ko točke premakneš, ovojnica postane drug večkotnik, ki ju objame. Krivulja ostane v njem, tudi ko jo močno ukriviš.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja kot prej, zdaj z vidnim kontrolnim poligonom (lomljena črta skozi štiri točke) in konveksno ovojnico (pravokotnik z oglišči v štirih točkah). Točke se lahko premikajo, poligon in ovojnica jim sledita.*

## Korak 3/4: Zakaj krivulja ne more ven

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Zakaj krivulja ne more ven

[besedilo] Zakaj krivulja ostane v ovojnici? Na sredini poti, pri parametru \(t=\tfrac12\), je na krivulji točka z oznako \(B(\tfrac12)\). Vsaka kontrolna točka vpliva nanjo, a ne nujno enako močno. Moč vpliva imenujemo teža točke.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Zakaj krivulja ne more ven

[navodilo za opazovanje] Ugibaj: ali bo točko \(B(\tfrac12)\) bolj premaknil \(p_0\) ali \(p_1\)? Nato oba povleci za približno enako razdaljo, enega za drugim, in primerjaj, za koliko se premakne \(B(\tfrac12)\).

[skrito pod 'Kaj bi morali opaziti'] \(p_1\) jo premakne trikrat bolj. Pri \(t=\tfrac12\) ima \(p_1\) težo \(\tfrac38\), \(p_0\) pa samo \(\tfrac18\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Zakaj krivulja ne more ven

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[B(\tfrac12)=\tfrac18p_0+\tfrac38p_1+\tfrac38p_2+\tfrac18p_3\]
[rezultat] Za začetno lego točk, \(p_0=(-3,-2)\), \(p_1=(-3,2)\), \(p_2=(3,2)\), \(p_3=(3,-2)\), je \(B(\tfrac12)=(0,1)\).
[preverjanje] Teže so \(\tfrac18,\tfrac38,\tfrac38,\tfrac18\): nobena ni negativna in skupaj dajo 1. Taki vsoti rečemo uteženo povprečje: povprečje, v katerem imajo nekatere točke večjo težo. Uteženo povprečje točk vedno leži v njihovi ovojnici. Enako velja pri vsakem \(t\) med 0 in 1, zato krivulja ne more ven.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična krivulja s poligonom in ovojnico; na krivulji je na sredini loka točka z oznako \(B(\tfrac12)\). Točke se lahko premikajo in točka \(B(\tfrac12)\) jim sledi.*

## Korak 4/4: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Skozi dve od štirih točk: zanesljivo sta na krivulji le prva in zadnja. Sme pa samo v konveksno ovojnico, ker je vsaka njena točka uteženo povprečje kontrolnih točk. Zato iz točk vnaprej veš, v katerem območju bo krivulja.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Izziv: zamenjaj mesti \(p_1\) in \(p_2\), da se stranici poligona prekrižata. Kaj naredi krivulja in kje je glede na ovojnico?

[skrito pod 'Kaj bi morali opaziti'] Krivulja naredi zanko in se seka sama s seboj, a ostane znotraj ovojnice.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Privzeta kubična krivulja s kontrolnim poligonom in konveksno ovojnico; vse točke se lahko prosto premikajo.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
