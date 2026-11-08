# subdivision-guided (lesson script r1)

**Naslov:** Subdivizija: krivuljo razrežemo na dva kosa

**Uvod (viden na prvem koraku, prvem okvirju):** Ali lahko Bézierjevo krivuljo razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, ne da bi se oblika spremenila? In kje dobiš kontrolne točke obeh kosov? Odgovor je že na grafu, v shemi, ki jo poznaš iz de Casteljauja.

## Korak 1/4: Kje so točke za nov kos

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje so točke za nov kos

[besedilo] Na grafu je krivulja s shemo de Casteljauja pri \(t=\tfrac12\): sredine stranic poligona, sredine teh sredin in na koncu ena točka na krivulji. Če krivuljo tu razrežemo, mora vsak kos spet dobiti štiri kontrolne točke. Katere?

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje so točke za nov kos

[navodilo za opazovanje] Poišči točko, kjer se shema konča. Nato po levem robu sheme pojdi od prve kontrolne točke do nje in preštej točke na poti.

[skrito pod 'Kaj bi morali opaziti'] Štiri: prva kontrolna točka, po ena točka iz prve in druge vrstice sheme in točka na krivulji. To so lahko kontrolne točke levega kosa. Desni kos vzame točke z desnega roba.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja z narisano shemo de Casteljauja pri \(t=\tfrac12\) (vmesne točke in daljice).*

## Korak 2/4: Rez

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Rez

[besedilo] Zdaj preizkusimo: krivuljo bomo res razrezali, točke za kosa pa vzeli z robov sheme. Zanima nas, ali bo oblika ostala enaka.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Rez

[navodilo za opazovanje] Najprej ugibaj, ali se bo oblika krivulje spremenila. Nato pritisni gumb Subdiviziraj in preštej kontrolne točke.

[skrito pod 'Kaj bi morali opaziti'] Oblika se ni spremenila. Namesto ene krivulje s štirimi točkami sta zdaj dve, skupaj z osmimi kontrolnimi točkami, in stikata se v točki, kjer se je shema končala.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Rez

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[P=(-4,-3),(-3,3),(3,3),(4,-3);\quad b^1=\bigl(-\tfrac72,0\bigr),(0,3),\bigl(\tfrac72,0\bigr);\quad b^2=\bigl(-\tfrac74,\tfrac32\bigr),\bigl(\tfrac74,\tfrac32\bigr);\quad b^3=\bigl(0,\tfrac32\bigr)\]
[rezultat] \[\text{levo: }(-4,-3),\bigl(-\tfrac72,0\bigr),\bigl(-\tfrac74,\tfrac32\bigr),\bigl(0,\tfrac32\bigr);\quad \text{desno: }\bigl(0,\tfrac32\bigr),\bigl(\tfrac74,\tfrac32\bigr),\bigl(\tfrac72,0\bigr),(4,-3)\]
[preverjanje] Levo vzamemo prve točke vrstic sheme, desno zadnje, v obratnem vrstnem redu. Skupna točka \(\bigl(0,\tfrac32\bigr)\) je \(B(\tfrac12)\). Desni kos je zrcalna slika levega, ker je privzeta krivulja simetrična.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja s shemo pri \(t=\tfrac12\), še ni razrezana (student pritisne Subdiviziraj sam).*

## Korak 3/4: Rez, ki ni na sredini

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Rez, ki ni na sredini

[besedilo] Zdaj vemo, da rez na sredini deluje. Kaj pa drugje? Parameter \(t\) določa, kje krivuljo razrežemo, drsnik \(t\) je tokrat nastavljen blizu začetka. Oranžni del na grafu je tisto, kar ostane desno od reza.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Rez, ki ni na sredini

[navodilo za opazovanje] Ugibaj, kateri kos bo krajši. Nato pritisni Subdiviziraj in preveri, ali sta kosa še vedno skupaj natanko prvotna krivulja.

[skrito pod 'Kaj bi morali opaziti'] Levi kos je krajši, ker je rez bliže začetku. Kosa sta spet Bézierjevi krivulji s po štirimi kontrolnimi točkami in skupaj še vedno natanko prekrijeta prvotno krivuljo.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Rez, ki ni na sredini

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[L(u)=B(tu),\qquad R(u)=B\bigl(t+(1-t)u\bigr),\qquad u\in[0,1]\]
[rezultat] Levi kos je prvotna krivulja na intervalu parametra od 0 do \(t\), desni kos pa na intervalu od \(t\) do 1.
[preverjanje] Parameter \(u\) teče po vsakem kosu od 0 do 1. Krivulja se ne spremeni, spremeni se samo opis s kontrolnimi točkami.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja s shemo pri \(t=\tfrac{3}{10}\). Rez še ni narejen (student pritisne Subdiviziraj sam).*

## Korak 4/4: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Da, krivuljo lahko razrežeš na dva kosa, ne da bi se oblika spremenila. Shema pri \(t\) da skupno točko, levi rob sheme kontrolne točke levega kosa, desni rob pa desnega. Vsak kos ima svoj kontrolni poligon, ki se krivulji tesneje prilega kot prvotni.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Izziv: premakni eno od kontrolnih točk levega kosa, tisto, ki je najbližje skupni točki. Kaj se zgodi s krivuljo v skupni točki?

[skrito pod 'Kaj bi morali opaziti'] Kosa sta zdaj samostojni krivulji. Če premakneš točko enega, se stik lahko zlomi. Dokler ju ne premakneš, sta natanko prvotna krivulja.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Krivulja je razrezana na dva dela pri \(t=\tfrac12\), vsak ima svoje kontrolne točke, ki se lahko premikajo.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
