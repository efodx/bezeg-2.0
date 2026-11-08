# bezier-pilot

**Naslov:** Bézierjeva krivulja: od točk do oblike

**Uvod (viden na prvem koraku, prvem okvirju):** Krivulja na grafu gre le skozi dve od štirih točk. Ali lahko krivulja kdaj uide iz območja, ki ga določajo vse štiri?

## Korak 1/5: Začetek in konec

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Začetek in konec

[besedilo] Na grafu so štiri kontrolne točke, z oznakami \(p_0\), \(p_1\), \(p_2\) in \(p_3\). Krivulji, ki jo oblikujejo, pravimo Bézierjeva krivulja. Take krivulje srečaš v risalnih programih in v pisavah za črke. Za odgovor na vprašanje z začetka najprej preverimo, katere točke krivulja zadene.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Začetek in konec

[navodilo za opazovanje] Napovej, skozi katere točke gre krivulja. Nato preveri na grafu, kje se krivulja začne in konča.

[skrito pod 'Kaj bi morali opaziti'] Krivulja se začne pri \(p_0\) in konča pri \(p_3\). Skozi \(p_1\) in \(p_2\) ne gre.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta simetrična kubična Bézierova krivulja v obliki loka s kontrolnimi točkami \(p_0=(-3,-2)\), \(p_1=(-3,2)\), \(p_2=(3,2)\) in \(p_3=(3,-2)\). Kontrolnega poligona ni; to je začetni prizor.*

## Korak 2/5: Konveksna ovojnica

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Konveksna ovojnica

[besedilo] Zdaj vemo, da krivulja ne gre skozi \(p_1\) in \(p_2\). Kam pa sme? Na grafu se pokažeta kontrolni poligon, lomljena črta skozi vse štiri točke, in konveksna ovojnica. Ovojnica je območje, ki ga dobiš, če okoli točk napneš gumico.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Konveksna ovojnica

[navodilo za opazovanje] Napovej, ali lahko krivulja zapusti ovojnico. Nato premakni \(p_1\) čim višje in opazuj rob ovojnice.

[skrito pod 'Kaj bi morali opaziti'] Ne. Krivulja ostane v ovojnici, tudi ko \(p_1\) premakneš čim višje. Zakaj, bomo videli na koncu.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta simetrična krivulja s kontrolnim poligonom (lomljena črta skozi štiri točke) in konveksno ovojnico (pravokotnik, ki obdaja točke). Točke so proste za premikanje.*

## Korak 3/5: Krajišči

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krajišči

[besedilo] Zdaj vemo, da krivulja ostane v ovojnici. Kaj pa njen začetek in konec? Parameter \(t\) pove, kje na krivulji smo: pri \(t=0\) smo na začetku, pri \(t=1\) pa na koncu. Krajišči sta tako \(p_0\) in \(p_3\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krajišči

[navodilo za opazovanje] Napovej, ali se krajišči premakneta, če premakneš \(p_2\). Nato premakni \(p_2\) in opazuj začetek in konec krivulje.

[skrito pod 'Kaj bi morali opaziti'] Krajišči ostaneta na mestu. Spremeni se le oblika med njima.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta simetrična krivulja s kontrolnim poligonom in konveksno ovojnico. Notranji točki \(p_1\) in \(p_2\) ležita zunaj krivulje.*

## Korak 4/5: Sredina loka

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Sredina loka

[besedilo] Zdaj vemo, kje se krivulja začne in konča. Kaj pa sredina? Označena točka je pri \(t=\tfrac12\), na sredini loka. Na njen položaj vplivajo vse štiri kontrolne točke.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Sredina loka

[navodilo za opazovanje] Napovej, ali se označena točka premakne bolj ali manj kot točka \(p_1\), če \(p_1\) premakneš navzgor. Nato to preizkusi in opazuj označeno točko.

[skrito pod 'Kaj bi morali opaziti'] Manj. Sredina je utežena vsota vseh štirih točk, vsaka s svojo težo. Zato se premakne le za \(\tfrac38\) premika točke \(p_1\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta simetrična krivulja s kontrolnim poligonom in konveksno ovojnico. Označena je točka pri \(t=\tfrac12\), na sredini loka, v \((0,1)\).*

## Korak 5/5: Zakaj ostane v ovojnici

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Zakaj ostane v ovojnici

[besedilo] Ne. Vsaka točka krivulje je utežena vsota kontrolnih točk. Uteži so vedno nič ali več in seštejejo se v \(1\), zato krivulja ostane v ovojnici. Krajišči sta vedno \(p_0\) in \(p_3\), notranji točki pa oblikujeta sredino loka.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Za tiste, ki želijo videti račun

[besedilo] Točko krivulje pri parametru \(t\) označimo z \(B(t)\).

[izračunani primer: Točka na sredini loka, \(t=\tfrac12\)]
[izračun] \[B(\tfrac12)=\tfrac18\,p_0+\tfrac38\,p_1+\tfrac38\,p_2+\tfrac18\,p_3\]
[rezultat] Uteži so vedno nič ali več in njihova vsota je \(1\), zato je točka uteženo povprečje kontrolnih točk.
[preverjanje] Če v formulo vstaviš koordinate točk z grafa, dobiš isto točko, ki je označena na sredini loka.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Izziv

[navodilo za opazovanje] Poskusi premakniti \(p_1\) in \(p_2\), da bo krivulja čim bolj ravna. Opazuj, kaj se pri tem zgodi z ovojnico.

[skrito pod 'Kaj bi morali opaziti'] Če vse štiri točke ležijo na isti premici, je krivulja ravna: leži na tej premici, ovojnica pa se stisne v daljico.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Privzeta simetrična krivulja s kontrolnim poligonom in konveksno ovojnico; vse točke so proste za premikanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
