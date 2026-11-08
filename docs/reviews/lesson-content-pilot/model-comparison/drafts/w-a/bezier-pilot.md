# bezier-pilot

**Naslov:** Bézierjeva krivulja: kako si izbere pot

**Uvod (viden na prvem koraku, prvem okvirju):** Krivulja zadene le dve od svojih štirih točk. Kako si potem izbere pot in kam ne more?

## Korak 1/6: Štiri točke, ena krivulja

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Štiri točke, ena krivulja

[besedilo] Na grafu so štiri oranžne kontrolne točke \(p_0\), \(p_1\), \(p_2\) in \(p_3\) ter zelena krivulja, ki jo določajo. S takimi krivuljami so narisani obrisi črk v pisavah, z njimi rišeš tudi z orodjem pero v risarskih programih. Krivulja pa ne gre skozi vse svoje točke. Kako si potem izbere pot?

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Štiri točke, ena krivulja

[navodilo za opazovanje] Napovej, skozi katere oranžne točke gre zelena krivulja. Nato povleci \(p_1\) navzgor in opazuj, ali ga krivulja dohiti.

[skrito pod 'Kaj bi morali opaziti'] Krivulja gre le skozi \(p_0\) in \(p_3\). Ko vlečeš \(p_1\), se lok napne proti njemu, a ga ne doseže. Notranji točki krivuljo le vlečeta k sebi.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična kubična Bézierjeva krivulja v obliki loka; štiri oranžne kontrolne točke z oznakami \(p_0\) do \(p_3\). Poligona in ovojnice ni.*

## Korak 2/6: Kje se začne in kam krene

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje se začne in kam krene

[besedilo] Zdaj veš, da krivulja zadene \(p_0\) in \(p_3\). Ali ju zadene vedno, ne glede na to, kam premakneš točke? Tanka lomljena črta, ki povezuje \(p_0\), \(p_1\), \(p_2\) in \(p_3\) po vrsti, je kontrolni poligon. Ob njem laže vidiš, kam krivulja krene.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje se začne in kam krene

[navodilo za opazovanje] Povleci \(p_2\), nato še \(p_3\). Katera od njiju premakne konec krivulje in v katero smer krivulja krene iz \(p_0\)?

[skrito pod 'Kaj bi morali opaziti'] Ob \(p_2\) se krivulja le upogne, konec ostane v \(p_3\). Ob \(p_3\) gre konec krivulje s točko. Krivulja se vedno začne v \(p_0\) in konča v \(p_3\). Iz \(p_0\) krene vzdolž prve stranice poligona, proti \(p_1\), v \(p_3\) pa pride iz smeri \(p_2\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja, točke spet na začetnih mestih. Viden je kontrolni poligon, ovojnice ni.*

## Korak 3/6: Kam krivulja ne more

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kam krivulja ne more

[besedilo] Krajišči sta torej pribita, vmes pa krivuljo vlečeta \(p_1\) in \(p_2\). Ali jo lahko odvlečeta kamor koli? Osenčeno območje okoli točk je konveksna ovojnica: najmanjši lik brez vdolbin, ki zajame vse štiri točke. Predstavljaj si elastiko, napeto okoli njih.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kam krivulja ne more

[navodilo za opazovanje] Povleci \(p_1\) in \(p_2\) kamor koli. Ali lahko zeleno krivuljo spraviš iz osenčenega območja?

[skrito pod 'Kaj bi morali opaziti'] Ne. Osenčeno območje se premika skupaj s točkami, krivulja pa ves čas ostane v njem. Kvečjemu se dotakne njegovega roba.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja, točke spet na začetnih mestih. Vidna sta kontrolni poligon in konveksna ovojnica, pri teh točkah osenčen pravokotnik.*

## Korak 4/6: Katera točka vleče močneje

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Katera točka vleče močneje

[besedilo] Zdaj veš, kam krivulja ne more. Kako močno pa jo vleče posamezna točka? Krivuljo si predstavljaj kot pot: v času \(t=0\) si v \(p_0\), v času \(t=1\) v \(p_3\). Točka z oznako \(B(\tfrac12)\) na vrhu loka pokaže, kje si na polovici časa.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Katera točka vleče močneje

[navodilo za opazovanje] Napovej, ali se \(B(\tfrac12)\) bolj premakne, ko povlečeš \(p_1\) ali ko povlečeš \(p_3\). Povleci vsako za približno enako razdaljo in primerjaj.

[skrito pod 'Kaj bi morali opaziti'] Ob \(p_1\) se \(B(\tfrac12)\) premakne precej bolj, približno trikrat toliko kot ob \(p_3\). Na sredini poti notranji točki vlečeta močneje od krajnih.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja s poligonom in ovojnico; na vrhu loka je točka z oznako \(B(\tfrac12)\), ki sledi premikom kontrolnih točk.*

## Korak 5/6: Mešanica štirih točk

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Mešanica štirih točk

[besedilo] Zakaj krivulja ne more iz ovojnice in zakaj \(p_1\) vleče močneje od \(p_3\)? Vsaka točka krivulje je mešanica vseh štirih kontrolnih točk. Vsaka dobi svoj delež; deleži niso nikoli negativni in skupaj dajo celoto. Taka mešanica vedno pade med točke, nikoli zunaj njih. Ko se \(t\) spreminja, se spreminjajo deleži.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Mešanica štirih točk

[navodilo za opazovanje] Napovej: ali \(B(\tfrac12)\) leži v središču osenčenega pravokotnika? Nato preberi njeno lego na mreži.

[skrito pod 'Kaj bi morali opaziti'] Ne. \(B(\tfrac12)\) leži v \((0,1)\), nad središčem. Pri \(t=\tfrac12\) dobi vsaka notranja točka trikrat večji delež kot krajna, zato zgornji točki \(p_1\) in \(p_2\) potegneta \(B(\tfrac12)\) navzgor. Isti delež je razlog, da je v prejšnjem koraku \(p_1\) vlekel močneje.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Mešanica štirih točk

[izračunani primer: Za tiste, ki želijo videti račun: deleži pri \(t=\tfrac12\)]
[izračun] \[(1-t)^3=\tfrac18,\quad 3(1-t)^2t=\tfrac38,\quad 3(1-t)t^2=\tfrac38,\quad t^3=\tfrac18\]
[rezultat] \[B(\tfrac12)=\tfrac18\bigl(p_0+3p_1+3p_2+p_3\bigr)=\tfrac18\bigl((-3,-2)+3(-3,2)+3(3,2)+(3,-2)\bigr)=(0,1)\]
[preverjanje] Deleži so nenegativni in njihov seštevek je \(\tfrac18+\tfrac38+\tfrac38+\tfrac18=1\). Delež \(p_1\) je \(\tfrac38\), delež \(p_3\) le \(\tfrac18\): zato se \(B(\tfrac12)\) ob \(p_1\) premakne trikrat bolj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Isti prizor kot v koraku 4, točke spet na začetnih mestih; \(B(\tfrac12)\) je na vrhu loka.*

## Korak 6/6: Kako si krivulja izbere pot

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kako si krivulja izbere pot

[besedilo] Pot si izbere tako, da se začne v \(p_0\) in krene proti \(p_1\), konča pa v \(p_3\), kamor pride iz smeri \(p_2\). Vmes je vsaka njena točka mešanica vseh štirih točk, na sredini poti z največjim deležem notranjih. Zato ne more iz konveksne ovojnice svojih kontrolnih točk.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kako si krivulja izbere pot

[navodilo za opazovanje] Izziv: iz te krivulje naredi črko S. Napovej, kam moraš postaviti \(p_1\) in \(p_2\), nato preveri z vlečenjem.

[skrito pod 'Kaj bi morali opaziti'] \(p_1\) in \(p_2\) postavi na nasprotni strani premice skozi \(p_0\) in \(p_3\). Ena notranja točka krivuljo vleče na eno stran, druga na drugo, zato krivulja najprej zavija v eno smer, nato v drugo. Ves čas ostane v osenčeni ovojnici.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Privzeta kubična krivulja s kontrolnim poligonom in konveksno ovojnico; vse točke so proste za premikanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
