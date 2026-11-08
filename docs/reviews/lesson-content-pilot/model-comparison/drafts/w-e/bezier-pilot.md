# bezier-pilot

**Naslov:** Bézierjeva krivulja: kam se ne more izmakniti?

**Uvod (viden na prvem koraku, prvem okvirju):** Bézierjeva krivulja ne gre skozi večino svojih točk. Kako si potem izbere pot in kam zagotovo ne zaide? Tako rišejo črke v pisavah, poti v risarskih programih in tire v animacijah.

## Korak 1/5: Točke, ki jih krivulja zavrača

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Točke, ki jih krivulja zavrača

[besedilo] Na grafu je lok in štiri kontrolne točke \(p_0\), \(p_1\), \(p_2\), \(p_3\). Krivulje ne risaš po točkah, ampak jo točke oblikujejo. Poglejmo, katere od njih krivulja sploh doseže.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Točke, ki jih krivulja zavrača

[navodilo za opazovanje] Preden pogledaš: skozi katere od štirih točk po tvoji presoji gre lok? Nato preveri na grafu.

[skrito pod 'Kaj bi morali opaziti'] Lok se začne v \(p_0\) in konča v \(p_3\). Točki \(p_1\) in \(p_2\) leži ob strani, krivulja ju le "gleda".

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična kubična Bézierova krivulja v obliki loka s štirimi kontrolnimi točkami; poligona in ovojnice ni (začetni prizor).*

## Korak 2/5: Kaj počneta notranji točki

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kaj počneta notranji točki

[besedilo] Zdaj vemo, da krivulja zares doseže le prvo in zadnjo točko. Kaj pa potem počneta \(p_1\) in \(p_2\)? Črta, ki povezuje vse štiri točke, se imenuje kontrolni poligon. Zdaj je prikazan.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kaj počneta notranji točki

[navodilo za opazovanje] Povleci \(p_1\) v različne smeri. Opazuj obe krajišči loka in njegovo obliko.

[skrito pod 'Kaj bi morali opaziti'] Krajišči ostaneta pri \(p_0\) in \(p_3\), spremeni se le oblika loka. Lok se premakne proti \(p_1\), kakor da bi ga ta vlekla.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja, viden je kontrolni poligon (lomljena črta skozi štiri točke); ovojnice ni. Stikalo "Kontrolni poligon" je vklopljeno.*

## Korak 3/5: Kam krivulja ne more

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kam krivulja ne more

[besedilo] Zdaj vemo, da točke krivuljo vlečejo, a je ne zgrabijo. Zato obstaja meja, ki je krivulja ne prestopi. Če okoli vseh štirih točk napneš najmanjšo konveksno lupino, je to konveksna ovojnica. Zdaj je narisana.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kam krivulja ne more

[navodilo za opazovanje] Povleci katero koli kontrolno točko daleč stran. Poskusi krivuljo spraviti iz konveksne ovojnice.

[skrito pod 'Kaj bi morali opaziti'] Ne uspe ti. Ovojnica se premika s točkami, krivulja pa vedno ostane znotraj nje.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja s kontrolnim poligonom in konveksno ovojnico (pravokotnik, ki obdaja točke). Stikali "Kontrolni poligon" in "Konveksna ovojnica" sta vklopljeni.*

## Korak 4/5: Kako točke vlečejo

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Kako točke vlečejo

[besedilo] Znotraj ovojnice krivulja ne sme kamor koli: vsaka točka na njej je mešanica vseh štirih kontrolnih točk. Vsaka točka ima svojo težo, teže pa skupaj dajo 1. Na sredini loka (\(t=\tfrac12\)) sta srednji točki močnejši od krajnih.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Kako točke vlečejo

[izračunani primer: Račun za točko na sredini loka (za tiste, ki želijo videti račun)]
[izračun] \[p_0=(-3,-2),\;p_1=(-3,2),\;p_2=(3,2),\;p_3=(3,-2)\]
[rezultat] \[B(1/2)=\frac18(p_0+3p_1+3p_2+p_3)=\frac18(0,8)=(0,1)\]
[preverjanje] Teže \(1/8,\,3/8,\,3/8,\,1/8\) so pozitivne in dajo 1, zato je točka v ovojnici. To ni aritmetično povprečje točk, ki bi bilo \((0,0)\).

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Kako točke vlečejo

[navodilo za opazovanje] Poišči označeno točko na sredini loka. Ugibaj: kam se premakne, če povlečeš \(p_1\) navzgor? Nato poskusi.

[skrito pod 'Kaj bi morali opaziti'] Označena točka se premakne navzgor, a manj kot \(p_1\), ker ima \(p_1\) le težo \(\tfrac38\). Ostane znotraj ovojnice.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja s poligonom in ovojnico; na krivulji je označena točka pri \(t=\tfrac12\), na sredini loka, v \((0,1)\).*

## Korak 5/5: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Krivulja ne gre skozi večino svojih točk, ker so te le sile, ki jo vlečejo. Zato jo lahko oblikuješ z roko. Na grafu je nesimetrična krivulja: tudi zdaj sta krajišči pri \(p_0\) in \(p_3\), točka na sredini pa je spet utežena mešanica vseh štirih.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Izziv: povleci \(p_1\) in \(p_2\) tako, da bo lok čim bolj podoben črki S. Pri tem opazuj ovojnico.

[skrito pod 'Kaj bi morali opaziti'] Krajišči ostaneta, lok pa nikoli ne zapusti ovojnice. Zato S nastane, ko točki \(p_1\) in \(p_2\) potegneš na nasprotni strani zveznice \(p_0p_3\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Nesimetrična kubična krivulja s točkami \((-3,-2)\), \((-1,3)\), \((2,-1)\), \((3,2)\); poligon in ovojnica sta vidna, na krivulji je označena točka pri \(t=\tfrac12\), v \((3/8,3/4)\).*
