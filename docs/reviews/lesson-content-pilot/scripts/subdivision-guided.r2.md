# subdivision-guided (lesson script r2)

**Naslov:** Subdivizija: krivuljo razrežemo na dva kosa

**Uvod (viden na prvem koraku, prvem okvirju):** Risalni programi krivuljo razrežejo, da lahko urejajo samo del oblike ali iščejo presečišča kos za kosom. Ali lahko Bézierjevo krivuljo razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, ne da bi se oblika spremenila? In od kod vzameš kontrolne točke obeh kosov?

## Korak 1/4: Kje je meja med kosoma

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje je meja med kosoma

[besedilo] Na grafu je krivulja z njeno shemo de Casteljauja pri \(t=\tfrac12\). Shema so točke in daljice znotraj poligona: sredine stranic, sredine teh sredin in na koncu ena točka na krivulji. Oranžni del krivulje je tisto, kar leži za to točko.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje je meja med kosoma

[navodilo za opazovanje] Poišči točko na krivulji, v kateri se shema konča. Kje leži glede na modri in oranžni del?

[skrito pod 'Kaj bi morali opaziti'] Točka leži na krivulji natanko tam, kjer se modri del konča in oranžni začne. Pri \(t=\tfrac12\) je to sredina krivulje. Ta točka bo skupna točka obeh kosov.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja s shemo de Casteljauja pri \(t=\tfrac12\) (vmesne točke in daljice); krivulja je modra, njen preostanek za točko reza pa oranžen. Pod grafom sta drsnik Parameter subdivizije t in gumb Subdiviziraj.*

## Korak 2/4: Rez

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Rez

[besedilo] Zdaj krivuljo res razrežemo. Kontrolne točke obeh kosov ne bodo nove, vzamemo jih z roba sheme: levi kos z levega roba, od prve kontrolne točke do točke na krivulji, desni kos z desnega roba.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Rez

[navodilo za opazovanje] Ugibaj, ali se bo oblika krivulje spremenila. Nato pod grafom pritisni gumb Subdiviziraj in preštej kontrolne točke obeh kosov.

[skrito pod 'Kaj bi morali opaziti'] Oblika se ni spremenila. Namesto ene krivulje s štirimi kontrolnimi točkami sta zdaj dve, vsaka s štirimi, skupaj torej osem. Stikata se v točki, kjer se je shema končala.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Rez

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] Shema ima tri vrstice vmesnih točk. Prve točke vrstic, skupaj s prvo kontrolno točko, so kontrolne točke levega kosa; zadnje točke vrstic, skupaj z zadnjo kontrolno točko, pa so kontrolne točke desnega kosa, v obratnem vrstnem redu.
[rezultat] Za privzeto krivuljo je skupna točka \(\bigl(0,\tfrac32\bigr)\).
[preverjanje] Desni kos je zrcalna slika levega, ker je privzeta krivulja simetrična.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja s shemo pri \(t=\tfrac12\), še ni razrezana. Student sam pritisne gumb Subdiviziraj.*

## Korak 3/4: Rez, ki ni na sredini

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Rez, ki ni na sredini

[besedilo] Zdaj vemo, da rez na sredini deluje. Kaj pa drugje? Drsnik Parameter subdivizije t določa, kje krivuljo razrežemo. Tokrat je nastavljen blizu začetka, zato je oranžni del daljši.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Rez, ki ni na sredini

[navodilo za opazovanje] Ugibaj, kateri kos bo krajši. Nato pritisni Subdiviziraj in preveri, ali sta kosa spet skupaj natanko prvotna krivulja.

[skrito pod 'Kaj bi morali opaziti'] Modri, levi kos je krajši, ker je rez bliže začetku. Kosa sta spet Bézierjevi krivulji s po štirimi kontrolnimi točkami in skupaj še vedno natanko prekrijeta prvotno krivuljo.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Rez, ki ni na sredini

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[L(u)=B(tu),\qquad R(u)=B\bigl(t+(1-t)u\bigr),\qquad u\in[0,1]\]
[rezultat] Levi kos \(L\) je prvotna krivulja \(B\) na intervalu parametra od 0 do \(t\), desni kos \(R\) pa na intervalu od \(t\) do 1.
[preverjanje] Parameter \(u\) teče po vsakem kosu od 0 do 1. Krivulja se ne spremeni, spremeni se samo opis s kontrolnimi točkami.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja s shemo pri \(t=\tfrac{3}{10}\); oranžni del je daljši od modrega. Rez še ni narejen.*

## Korak 4/4: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Da: krivuljo lahko razrežeš na dva kosa, ne da bi se oblika spremenila. Shema pri \(t\) da skupno točko, njen levi rob kontrolne točke modrega kosa, desni rob pa oranžnega. Vsak kos ima svoj kontrolni poligon, zato lahko urejaš samo en del oblike in drugega ne zmoti.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Izziv: primi predzadnjo kontrolno točko modrega kosa, tisto tik pred skupno točko, in jo povleci. Kaj se zgodi z obliko krivulje na mestu stika?

[skrito pod 'Kaj bi morali opaziti'] Ukrivi se samo modri kos, oranžni ostane. Na mestu stika lahko nastane oster zaklon, krivulja tam ni več gladka.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Krivulja je razrezana na modri in oranžni kos pri \(t=\tfrac12\); vsak kos ima svoje kontrolne točke, ki se lahko premikajo.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
