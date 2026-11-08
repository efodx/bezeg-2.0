# bezier-pilot (lesson script r1)

**Naslov:** Bézierjeva krivulja: kam sme in kam ne

**Uvod (viden na prvem koraku, prvem okvirju):** Bézierjeva krivulja ima štiri kontrolne točke, a gre skozi samo dve. Kako si potem izbere pot in kam ne more zaiti? Odgovor najdeš do konca lekcije.

## Korak 1/4: Krivulja in njene točke

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krivulja in njene točke

[besedilo] Na grafu je krivulja in njene kontrolne točke \(P_0\), \(P_1\), \(P_2\), \(P_3\). Krivulja se sicer ovija okoli njih, a jih ne povezuje kot navadna lomljena črta. Kaj ji torej določa pot?

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krivulja in njene točke

[navodilo za opazovanje] Primi \(P_1\) in ga povleci daleč stran. Ali ga krivulja doseže? Skozi katere točke gre krivulja ob vsakem premiku?

[skrito pod 'Kaj bi morali opaziti'] Krivulja se upogne proti \(P_1\), a ga ne doseže. Vedno pa se začne v \(P_0\) in konča v \(P_3\), prva in zadnja kontrolna točka sta namreč na krivulji.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična kubična Bézierjeva krivulja v obliki loka s štirimi kontrolnimi točkami. Poligona in ovojnice ni. Točke se lahko premikajo.*

## Korak 2/4: Kam krivulja ne more

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kam krivulja ne more

[besedilo] Zdaj vemo, da krivulja točk večinoma ne zadene. Kam pa sploh sme? Okoli štirih točk si zamisli napeto gumico. Lik, ki ga objame, je konveksna ovojnica. Na grafu je zdaj označena, poleg nje pa kontrolni poligon, ki točke povezuje po vrsti.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kam krivulja ne more

[navodilo za opazovanje] Premikaj \(P_1\) in \(P_2\) ter poskusi spraviti krivuljo iz označene ovojnice. Ti uspe?

[skrito pod 'Kaj bi morali opaziti'] Ne. Ovojnica se premika skupaj s točkami, krivulja pa ostane v njej, tudi ko jo močno ukriviš.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja kot prej, zdaj z vidnim kontrolnim poligonom (lomljena črta skozi štiri točke) in konveksno ovojnico (pravokotnik, ki obdaja točke). Točke se lahko premikajo, poligon in ovojnica jim sledita.*

## Korak 3/4: Zakaj krivulja ne more ven

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Zakaj krivulja ne more ven

[besedilo] Zakaj krivulja ostane v ovojnici? Na sredini poti, pri parametru \(t=\tfrac12\), je na krivulji označena točka. Vsaka kontrolna točka jo vleče proti sebi, a ne nujno enako močno.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Zakaj krivulja ne more ven

[navodilo za opazovanje] Povleci \(P_0\) za nekaj stran in opazuj označeno točko. Nato isto naredi s \(P_1\). Kateri premik je označeno točko premaknil bolj?

[skrito pod 'Kaj bi morali opaziti'] Premik \(P_1\). Pri \(t=\tfrac12\) ima \(P_1\) težo \(\tfrac38\), \(P_0\) pa samo \(\tfrac18\), zato \(P_1\) označeno točko premakne trikrat bolj.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Zakaj krivulja ne more ven

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[B(\tfrac12)=\tfrac18P_0+\tfrac38P_1+\tfrac38P_2+\tfrac18P_3\]
[rezultat] Za začetno lego točk, \(P_0=(-3,-2)\), \(P_1=(-3,2)\), \(P_2=(3,2)\), \(P_3=(3,-2)\), je \(B(\tfrac12)=(0,1)\).
[preverjanje] Teže so \(\tfrac18,\tfrac38,\tfrac38,\tfrac18\): nobena ni negativna in skupaj dajo 1. Točka je zato vedno uteženo povprečje kontrolnih točk in ne more iz njihove ovojnice. To velja tudi za druge vrednosti \(t\) med 0 in 1.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična krivulja s poligonom in ovojnico; na krivulji je označena točka pri \(t=\tfrac12\), na sredini loka. Točke se lahko premikajo in označena točka jim sledi.*

## Korak 4/4: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Krivulja ne gre skozi vse točke: zanesljivo sta na njej le prva in zadnja. Vsaka točka jo vleče z drugačno težo, zato ostane v ovojnici, ki jo napenjajo točke. Tako veš, kam krivulja ne more.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Izziv: postavi vse štiri točke čim bolj na isto premico. Kakšna je zdaj krivulja?

[skrito pod 'Kaj bi morali opaziti'] Krivulja se sploščí v odsek premice. Ovojnica točk na premici je daljica in krivulja ne more iz nje.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Privzeta kubična krivulja s kontrolnim poligonom in ovojnico; vse točke se lahko prosto premikajo.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
