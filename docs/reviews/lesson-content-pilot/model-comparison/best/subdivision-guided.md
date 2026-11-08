# subdivision-guided

**Naslov:** Subdivizija Bézierjeve krivulje

**Uvod (viden na prvem koraku, prvem okvirju):** Ali lahko Bézierjevo krivuljo razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, ne da bi se oblika spremenila? Če lahko, potem vsak kos urejaš posebej, kot bi bil samostojna poteza v risarskem programu.

## Korak 1/5: Rez v točki

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Rez v točki

[besedilo] Na grafu je krivulja s štirimi kontrolnimi točkami in Decasteljaujeva shema: pomožne črte in točke, ki se zožujejo proti eni točki na krivulji. Krivuljo bomo razrezali prav v njej.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Rez v točki

[navodilo za opazovanje] Poišči točko, v kateri se shema konča. Ugibaj: koliko kontrolnih točk bo imel levi kos po rezu?

[skrito pod 'Kaj bi morali opaziti'] Štiri, tako kot cela krivulja. Vsak kos bo spet kubična Bézierjeva krivulja. Preverili bomo v tretjem koraku.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja s shemo de Casteljauja pri \(t=\tfrac12\) (vmesne točke in daljice); shema se konča v točki na sredini krivulje.*

## Korak 2/5: Kam postaviš rez

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kam postaviš rez

[besedilo] Mesto reza določa parameter \(t\). Z drsnikom Parameter subdivizije \(t\) pod grafom premikaš točko reza po krivulji. Del krivulje do reza je moder, preostanek je oranžen.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kam postaviš rez

[navodilo za opazovanje] Premikaj drsnik in spremljaj, kako se spreminjata moder in oranžen del. Kam moraš postaviti rez, da sta enako dolga?

[skrito pod 'Kaj bi morali opaziti'] Na sredino, torej \(t=\tfrac12\). Krivulja je simetrična, zato sta tam moder in oranžen del enako dolga.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Shema se prestavi na \(t=\tfrac{3}{10}\); krivulja ostane ista. Moder del je krajši, oranžen daljši.*

## Korak 3/5: Rez

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Rez

[besedilo] Zdaj krivuljo res razrežemo. Drsnik je na sredini. Gumb Subdiviziraj pod grafom razreže krivuljo v točki reza in jo nadomesti z dvema.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Rez

[navodilo za opazovanje] Ugibaj: ali se bo oblika krivulje po rezu spremenila? Pritisni Subdiviziraj in poglej.

[skrito pod 'Kaj bi morali opaziti'] Oblika je enaka kot prej, le da zdaj vidiš moder in oranžen kos. Vsak ima svoje štiri kontrolne točke; zadnja točka modrega in prva oranžnega sta ista točka na krivulji.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja kot prej, drsnik je na sredini (\(t=\tfrac12\)), gumb Subdiviziraj še ni pritisnjen. Po pritisku se pokažeta dva kosa.*

## Korak 4/5: Od kod nove točke

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Od kod nove točke

[besedilo] Zdaj vemo, da rez deluje. Od kod kosa dobita nove kontrolne točke? Odgovor je v shemi, ki je spet na grafu, krivulja pa cela. Njene vrstice se krčijo: prva ima tri točke, naslednja dve, zadnja eno, to je točka na krivulji.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Od kod nove točke

[navodilo za opazovanje] Ugibaj: katere štiri točke sheme postanejo kontrolne točke modrega kosa? Namig: modri kos se začne v začetku krivulje in konča v točki, kjer se shema konča.

[skrito pod 'Kaj bi morali opaziti'] Tiste ob levem robu sheme: začetek krivulje, prva točka prve vrstice, prva točka druge vrstice in točka na krivulji. Oranžni kos dobi točke ob desnem robu.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Od kod nove točke

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[P=(-4,-3),(-3,3),(3,3),(4,-3);\quad b^1=\bigl(-\tfrac72,0\bigr),(0,3),\bigl(\tfrac72,0\bigr);\quad b^2=\bigl(-\tfrac74,\tfrac32\bigr),\bigl(\tfrac74,\tfrac32\bigr);\quad b^3=\bigl(0,\tfrac32\bigr)\]
[rezultat] \[\text{levi kos: }(-4,-3),\bigl(-\tfrac72,0\bigr),\bigl(-\tfrac74,\tfrac32\bigr),\bigl(0,\tfrac32\bigr)\]
[preverjanje] Zadnja točka \(\bigl(0,\tfrac32\bigr)\) je \(B(\tfrac12)\). Desni kos je zrcalna slika levega, ker je krivulja simetrična.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja je spet cela, shema je pri \(t=\tfrac12\), reza ni.*

## Korak 5/5: Da, lahko

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Da, lahko

[besedilo] Da, lahko. Pri vsakem rezu \(t\) dobiš dva kosa, ki sta spet Bézierjevi krivulji iste stopnje. Njune kontrolne točke so robovi sheme, kosa pa skupaj natanko pokrijeta prvotno krivuljo. Na grafu je rez pri \(t=\tfrac{3}{10}\), zato je moder kos krajši.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Da, lahko

[navodilo za opazovanje] Preizkusi, kaj ti rez omogoči. Ugibaj: če povlečeš eno kontrolno točko modrega kosa, se bo premaknil tudi oranžen kos?

[skrito pod 'Kaj bi morali opaziti'] Ne. Oranžni kos ostane pri miru. Po rezu je vsak kos samostojna krivulja, zato lahko eno stran popraviš, ne da bi pokvaril drugo.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Krivulja je razrezana na dva neenaka dela pri \(t=\tfrac{3}{10}\): krajši moder in daljši oranžen kos.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
