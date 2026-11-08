# bezier-pilot

**Naslov:** Bézierjeva krivulja: od točk do oblike

**Uvod (viden na prvem koraku, prvem okvirju):** Na grafu so štiri točke in krivulja, ki gre skozi samo dve od njih. Kako si potem izbere pot in kam sploh ne more priti? Do konca lekcije boš to znal napovedati, preden premakneš točko.

## Korak 1/6: Krivulja, ki se izogiba svojim točkam

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krivulja, ki se izogiba svojim točkam

[besedilo] Vsaka črka v pisavi na tem zaslonu in vsaka pot v risarskem programu je sestavljena iz takih krivulj. Oblikovalec ne riše krivulje, ampak premika nekaj točk, krivulja pa jim sledi. Tem točkam rečemo kontrolne točke: \(p_0\), \(p_1\), \(p_2\) in \(p_3\).

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krivulja, ki se izogiba svojim točkam

[navodilo za opazovanje] Najprej ugani: skozi katere od točk \(p_0\) do \(p_3\) gre krivulja? Potem primi zgornjo točko \(p_1\) in jo povleci še višje. Ali jo krivulja dohiti?

[skrito pod 'Kaj bi morali opaziti'] Krivulja gre skozi \(p_0\) in \(p_3\), ne pa skozi \(p_1\) in \(p_2\). Ko vlečeš \(p_1\) navzgor, se krivulja dvigne za njo, a je ne doseže.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična kubična Bézierjeva krivulja v obliki loka s štirimi kontrolnimi točkami \(p_0\) do \(p_3\). Poligona in ovojnice ni.*

## Korak 2/6: Kam krivulja ne more

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kam krivulja ne more

[besedilo] Zdaj veš, da krivulja točk \(p_1\) in \(p_2\) ne doseže. Kako daleč od njih pa lahko uide? Na grafu sta se pojavili dve pomoči: kontrolni poligon, siva lomljena črta od \(p_0\) prek \(p_1\) in \(p_2\) do \(p_3\), in konveksna ovojnica, obarvano območje, napeto okrog vseh štirih točk kot elastika.

[formula/oznake] Konveksna ovojnica je najmanjše območje brez vdolbin, ki vsebuje vse kontrolne točke.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kam krivulja ne more

[navodilo za opazovanje] Poskusi krivuljo povleči iz obarvane ovojnice: vleci \(p_1\) in \(p_2\) v različne smeri in glej, ali kak kos krivulje kdaj stopi čez njen rob.

[skrito pod 'Kaj bi morali opaziti'] Ne gre. Ovojnica se premika skupaj s točkami in krivulja ostane vedno v njej. To je prvi odgovor na vprašanje "kam ne more": nikoli iz ovojnice svojih kontrolnih točk.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja; prikazana sta kontrolni poligon (lomljena črta skozi štiri točke) in konveksna ovojnica (pravokotnik, ki obdaja točke). Oboje sledi točkam pri vlečenju.*

## Korak 3/6: Dve točki, ki ju krivulja ne izpusti

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Dve točki, ki ju krivulja ne izpusti

[besedilo] Krivulja torej ostane v ovojnici. Znotraj nje pa dve točki izstopata: v prvem koraku je šla krivulja natanko skozi \(p_0\) in \(p_3\). Je to naključje te oblike ali pravilo? Ovojnica je zdaj skrita, viden je le kontrolni poligon, da bolje vidiš krajišči.

[formula/oznake] \[B(0)=p_0,\qquad B(1)=p_3\]

[formula/oznake] \(B\) je krivulja, število v oklepaju pove, kje na krivulji smo: \(0\) je začetek, \(1\) je konec.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Dve točki, ki ju krivulja ne izpusti

[navodilo za opazovanje] Napovej: če povlečeš \(p_0\), ali se bo krivulja odlepila od nje? Potem povleci \(p_0\) nekam daleč, nato še \(p_2\), in glej, kaj se zgodi z začetkom in koncem krivulje.

[skrito pod 'Kaj bi morali opaziti'] Krivulja se od \(p_0\) ne odlepi; začetek potuje z njo. Premik \(p_2\) spremeni obliko, začetek v \(p_0\) in konec v \(p_3\) pa ostaneta na mestu. Prva in zadnja točka sta vedno na krivulji, srednji dve le vlečeta.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja, viden je le kontrolni poligon (ovojnice ni). Krivulja se začne in konča v prvi in zadnji točki, notranji dve ležita zunaj nje.*

## Korak 4/6: Kako močno vleče vsaka točka

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Kako močno vleče vsaka točka

[besedilo] Krajišči držita krivuljo, srednji točki jo vlečeta. Koliko pa? Na krivulji je zdaj označena točka \(B(\tfrac12)\), njena sredina. Njen položaj je mešanica vseh štirih kontrolnih točk: vsaka prispeva svoj delež, deleži skupaj dajo 1. Sredina krivulje posluša \(p_1\) in \(p_2\) trikrat bolj kot \(p_0\) in \(p_3\).

[formula/oznake] \[B(\tfrac12)=\tfrac18\,p_0+\tfrac38\,p_1+\tfrac38\,p_2+\tfrac18\,p_3\]

[formula/oznake] Deleži \(\tfrac18,\tfrac38,\tfrac38,\tfrac18\) so uteži kontrolnih točk na sredini krivulje; seštejejo se v 1.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Kako močno vleče vsaka točka

[izračunani primer: Kubična krivulja pri \(t=1/2\)]
[izračun] Za tiste, ki želijo videti račun: koordinate \(p_0\) do \(p_3\) preberi z grafa in jih vstavi v \[B(\tfrac12)=\tfrac18\,(p_0+3p_1+3p_2+p_3).\]
[rezultat] \[B(\tfrac12)=\tfrac18\,(0,8)=(0,1)\]
[preverjanje] Navadno povprečje štirih točk bi bilo \((0,0)\), sredina krivulje pa je višje, ker zgornji točki \(p_1\) in \(p_2\) štejeta trikrat.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Kako močno vleče vsaka točka

[navodilo za opazovanje] Napovej, kam se premakne označena točka \(B(\tfrac12)\), če \(p_1\) povlečeš za en kvadratek navzgor. Potem to naredi in preberi njeno novo višino z mreže.

[skrito pod 'Kaj bi morali opaziti'] Točka \(B(\tfrac12)\) se dvigne za približno \(\tfrac38\) kvadratka, torej precej manj kot \(p_1\). Če bi za enako premaknil \(p_0\), bi se premaknila le za \(\tfrac18\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja s poligonom in ovojnico; na sredini loka je označena točka z oznako \(B(\frac12)\), v \((0,1)\).*

## Korak 5/6: Ista pravila, druga oblika

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Ista pravila, druga oblika

[besedilo] Uteži \(\tfrac18,\tfrac38,\tfrac38,\tfrac18\) niso lastnost lepe simetrične oblike. Pred teboj je zdaj zvita, nesimetrična krivulja s povsem drugimi kontrolnimi točkami. Ali zanjo še vedno velja, da sredina posluša srednji točki trikrat bolj kot krajišči? Označena točka \(B(\tfrac12)\) je spet na grafu, da lahko preveriš.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Ista pravila, druga oblika

[izračunani primer: Nesimetrična kubična krivulja pri \(t=1/2\)]
[izračun] Za tiste, ki želijo videti račun: preberi \(p_0\) do \(p_3\) z grafa in vstavi v isti obrazec \[B(\tfrac12)=\tfrac18\,(p_0+3p_1+3p_2+p_3).\]
[rezultat] \[B(\tfrac12)=\tfrac18\,(3,6)=(\tfrac38,\tfrac34)\]
[preverjanje] Uteži so iste kot prej; drugačen rezultat pride samo od drugačnih kontrolnih točk.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Ista pravila, druga oblika

[navodilo za opazovanje] Povleci \(p_2\) tako, da krivulja postane čim bolj ravna. Med vlečenjem glej troje: označeno točko \(B(\tfrac12)\), obarvano ovojnico in krajišči \(p_0\) in \(p_3\).

[skrito pod 'Kaj bi morali opaziti'] Točka \(B(\tfrac12)\) sledi \(p_2\), a s krajšimi koraki. Ovojnica se preoblikuje in krivulja ostane v njej, krajišči se ne premakneta. Krivulja postane skoraj ravna, ko \(p_1\) in \(p_2\) ležita blizu daljice od \(p_0\) do \(p_3\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Nesimetrična kubična krivulja z drugačnimi kontrolnimi točkami; poligon in ovojnica sta vidna, označena je točka \(B(\frac12)\) pri \((3/8,3/4)\).*

## Korak 6/6: Zdaj znaš napovedati

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Zdaj znaš napovedati

[besedilo] Kako si torej krivulja izbere pot? Tako, da je vsaka njena točka mešanica kontrolnih točk; srednji točki vlečeta močneje, ne da bi krivulja šla skoznju. Kam ne more? Nikoli iz konveksne ovojnice svojih točk. In od česa se ne odlepi? Od \(p_0\) in \(p_3\), kjer se vedno začne in konča.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Zdaj znaš napovedati

[navodilo za opazovanje] Izziv: premakni kontrolne točke tako, da krivulja naredi zanko in se enkrat sama sebe prekriža. Preden spustiš točko, napovej, ali bo zanka ostala znotraj obarvane ovojnice.

[skrito pod 'Kaj bi morali opaziti'] Zanka nastane, ko poligon prekrižaš, na primer tako, da \(p_1\) povlečeš na desno stran \(p_2\) in \(p_2\) na levo stran \(p_1\). Tudi zanka ostane v ovojnici in krivulja se še vedno začne v \(p_0\) in konča v \(p_3\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Vrne se privzeta kubična krivulja s poligonom in ovojnico; vse točke so proste za premikanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
