# curve-curvature-guided

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Kateri konec te krivulje se bolj zavije, začetek ali konec? Odgovor najdeš s pomočjo števila, ki ga bereš na grafu.

## Korak 1/5: Kateri konec se bolj zavije?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec se bolj zavije?

[besedilo] Na grafu je kubična krivulja. Začetek je pri \(t=0\), konec pri \(t=1\). Pri načrtovanju cest in tirov je pomembno, kje je ovinek najostrejši. Zavijanje meriš s številom, ukrivljenostjo \(\kappa\). Bereš jo v izpisu v zgornjem levem kotu grafa.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec se bolj zavije?

[navodilo za opazovanje] Ugibaj, ali se bolj zavije začetek ali konec. Nato premakni drsnik \(t\) na \(0\), preberi ukrivljenost, premakni ga na \(1\) in preberi še enkrat.

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0\) izpis kaže \(0{,}6667\), pri \(t=1\) pa veliko manj. Začetek se zato zavije bolj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0{,}5\); krivinska krožnica in tangenta sta skriti, izpis ukrivljenosti je v zgornjem levem kotu grafa.*

## Korak 2/5: Krožnica, ki se najbolj prilega

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krožnica, ki se najbolj prilega

[besedilo] Zdaj vemo, da se začetek zavije bolj. Kako to vidiš na sliki? Krivulji se v dani točki najbolje prilega krožnica, ki se je dotika in se zavija enako ostro kot ona. Polmer te krožnice \(R\) se imenuje krivinski polmer. Tangenta \(T\) je premica, ki se krivulje dotika; normala \(N\) je nanjo pravokotna.

[formula/oznake] \[R=\frac{1}{|\kappa|}\]

[formula/oznake] \(\kappa\) je ukrivljenost iz izpisa, \(|\kappa|\) pa njena velikost.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krožnica, ki se najbolj prilega

[navodilo za opazovanje] Predvidi, kako velika bo krožnica pri \(t=1\) v primerjavi s tisto pri \(t=0\). Nato premakni drsnik \(t\) na \(1\) in opazuj krožnico.

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=1\) je krožnica veliko večja, krivulja se tam skoraj izravna. Pri \(t=0\) je polmer krožnice \(1{,}5\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0\); krivinska krožnica, tangenta \(T\) in normala \(N\) so vidne.*

## Korak 3/5: Od krožnice do števila

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Od krožnice do števila

[besedilo] Krožnica pokaže, kako ostro se krivulja zavije. Kaj pa število v izpisu? Ukrivljenost \(\kappa\) meri, kako hitro se smer tangente obrača na enoto poti.

[formula/oznake] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}}\]

[formula/oznake] \(x'\) je vodoravna hitrost, \(y'\) navpična, \(y''\) pa pove, kako se navpična hitrost spreminja. Odvodi so po \(t\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Od krožnice do števila

[izračunani primer: Kubična krivulja pri \(t=0\), za tiste, ki želijo videti račun]
[izračun] Iz \(x=3t\) in \(y=3t^2\) dobimo pri \(t=0\): \(x'=3\), \(y'=0\), \(y''=6\) in \(x''=0\). Zato je \[\kappa=\frac{3\cdot 6-0\cdot 0}{(3^2+0^2)^{3/2}}=\frac{18}{27}=\frac{2}{3}\]
[rezultat] \[\kappa=\frac{2}{3}\approx0{,}6667\]
[preverjanje] Izpis pri \(t=0\) pokaže enako vrednost.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Od krožnice do števila

[navodilo za opazovanje] Preberi ukrivljenost v izpisu pri \(t=0\) in jo primerjaj z računom.

[skrito pod 'Kaj bi morali opaziti'] Ujemata se. Ukrivljenost je obratna vrednost krivinskega polmera: velika krožnica pomeni majhno ukrivljenost in obratno.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Točka se prestavi na \(t=0\); krivinska krožnica in tangenta sta vidni (\(\kappa=0{,}6667\)).*

## Korak 4/5: Krivulja, ki se zavija na obe strani

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krivulja, ki se zavija na obe strani

[besedilo] Doslej je bila krivulja zavita le na eno stran. Kaj pa, če se zavije tudi v drugo smer? Ukrivljenost ima tudi predznak: pozitivna pomeni zavoj v levo, negativna pa zavoj v desno. Krivulja je v obliki črke \(S\): od začetka proti koncu se najprej zavije v desno, nato v levo. Točka, kjer se zavoj obrne, je prevoj.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krivulja, ki se zavija na obe strani

[navodilo za opazovanje] Napovej, pri katerem \(t\) se krožnica spremeni v premico. Nato premakni drsnik \(t\) od \(0\) proti \(1\) in preveri.

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0{,}5\) je ukrivljenost \(0\) in krožnica se spremeni v premico. Tik pred tem in tik za tem je krožnica na nasprotnih straneh krivulje.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja v obliki črke \(S\), točka pri \(t=0\); krivinska krožnica in tangenta sta vidni.*

## Korak 5/5: Odgovor na začetno vprašanje

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor na začetno vprašanje

[besedilo] Zdaj vemo, kaj število in krožnica pomenita. Začetek se zavije bolj, ker je tam krivinska krožnica najmanjša. Ukrivljenost \(\kappa\) meri, kako ostro se krivulja zavija: večja kot je, manjši je krivinski polmer \(R\). S tem lahko poiščeš ostre ovinke na poljubni krivulji.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor na začetno vprašanje

[navodilo za opazovanje] Zdaj prosto raziskuj: napovej, ali se začetek zavije bolj ali manj, če dvigneš kontrolno točko \(p_2\). Nato jo premakni više in preberi ukrivljenost pri \(t=0\).

[skrito pod 'Kaj bi morali opaziti'] Ukrivljenost pri \(t=0\) naraste in krožnica se skrči. Začetek krivulje določajo le prve tri kontrolne točke, zato premik \(p_3\) ne spremeni ukrivljenosti pri \(t=0\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Kubična krivulja, točka pri \(t=0\); krivinska krožnica in tangenta sta vidni, izpis ukrivljenosti je v zgornjem levem kotu grafa.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
