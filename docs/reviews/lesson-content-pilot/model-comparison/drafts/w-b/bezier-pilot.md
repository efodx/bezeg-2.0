# bezier-pilot

**Naslov:** Bézierjeva krivulja: kako si izbere pot

**Uvod (viden na prvem koraku, prvem okvirju):** Bézierjeva krivulja večine svojih točk ne zadene, pa jo z njimi vseeno vodiš natančno: tako nastajajo črke v pisavah in poti v risarskih programih. Kako si krivulja izbere pot in kam ne more nikoli?

## Korak 1/6: Točke, ki jih krivulja zgreši

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Točke, ki jih krivulja zgreši

[besedilo] Na grafu so krivulja in štiri točke, \(p_0\) do \(p_3\). Pisave in risarski programi oblikujejo krivulje prav z vlečenjem takih točk. Poglejmo, kako točke vodijo krivuljo.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Točke, ki jih krivulja zgreši

[navodilo za opazovanje] Ugibaj: če povlečeš \(p_1\) navzgor, ali bo šla krivulja skozi to točko? Povleci jo in preveri.

[skrito pod 'Kaj bi morali opaziti'] Ne. Krivulja se nagne proti \(p_1\), vendar točke ne doseže.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Simetrična kubična Bézierova krivulja v obliki loka s točkami \(p_0\) do \(p_3\). Poligona in ovojnice še ni.*

## Korak 2/6: Pribita konca

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Pribita konca

[besedilo] Krivulja torej ne gre skozi vse točke. Na grafu se je zdaj pokazala lomljena črta, ki točke povezuje po vrsti. Imenuje se kontrolni poligon.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Pribita konca

[navodilo za opazovanje] Povleci \(p_1\) in \(p_2\) kamorkoli. Ugibaj vnaprej: kateri dve točki krivulje ostaneta pri miru?

[skrito pod 'Kaj bi morali opaziti'] Začetek in konec krivulje. Krivulja se vedno začne v \(p_0\) in konča v \(p_3\), kamorkoli postaviš \(p_1\) in \(p_2\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja, zdaj s kontrolnim poligonom (lomljena črta skozi štiri točke). Ovojnice še ni.*

## Korak 3/6: Elastika okoli točk

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Elastika okoli točk

[besedilo] Konca sta pribita. Kaj pa sredina krivulje? Predstavljaj si elastiko, napeto okoli vseh štirih točk. Lik, ki ga omejuje, se imenuje konveksna ovojnica. Na grafu je označena.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Elastika okoli točk

[navodilo za opazovanje] Poskusi spraviti krivuljo ven iz označenega lika. Premikaj \(p_1\) in \(p_2\), tudi daleč stran. Ti uspe?

[skrito pod 'Kaj bi morali opaziti'] Ne. Ovojnica se premika skupaj s točkami, krivulja pa ostane vedno znotraj nje. Zato veš, kje krivulja zagotovo ne bo.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Poleg poligona se pokaže konveksna ovojnica (pravokotnik, ki obdaja štiri točke). Krivulja je enaka kot prej.*

## Korak 4/6: Sredina krivulje

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Sredina krivulje

[besedilo] Krivulja je v ovojnici, a kje natančno? Parameter \(t\) teče od \(0\) na začetku do \(1\) na koncu krivulje. Na grafu je označena točka \(B(\tfrac12)\), na polovici poti.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Sredina krivulje

[navodilo za opazovanje] Ugibaj: ali \(B(\tfrac12)\) leži v središču ovojnice, kjer bi bilo povprečje vseh štirih točk? Poglej graf.

[skrito pod 'Kaj bi morali opaziti'] Ne, leži višje: pri \(y=1\), središče ovojnice pa je pri \(y=0\). Točke ne vlečejo enako močno. Račun je v naslednjem okvirju.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Sredina krivulje

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[B(\tfrac12)=\tfrac18\left(p_0+3p_1+3p_2+p_3\right)\]
[rezultat] \[B(\tfrac12)=\tfrac18\left((-3,-2)+3(-3,2)+3(3,2)+(3,-2)\right)=(0,1)\]
[preverjanje] Notranji točki \(p_1\) in \(p_2\) vlečeta trikrat močneje kot krajišči. Zato je rezultat višje od povprečja \((0,0)\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja s poligonom in ovojnico; na krivulji je označena točka \(B(\tfrac12)\) na sredini loka, v \((0,1)\).*

## Korak 5/6: Kdo vleče najmočneje

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kdo vleče najmočneje

[besedilo] Zdaj je krivulja nesimetrična, \(B(\tfrac12)\) pa je še vedno na polovici poti. Primerjajmo, kako premiki posameznih točk vplivajo nanjo.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kdo vleče najmočneje

[navodilo za opazovanje] Ugibaj vnaprej. Povleci \(p_1\) za nekaj kvadratkov in poglej, za koliko se premakne \(B(\tfrac12)\). Isto naredi s \(p_0\). Pri kateri točki se premakne bolj?

[skrito pod 'Kaj bi morali opaziti'] Pri \(p_1\): približno trikrat bolj kot pri \(p_0\). Točka \(p_1\) vleče s tremi osminami moči, \(p_0\) pa z eno osmino. Pri tem \(B(\tfrac12)\) ostane v ovojnici.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Nesimetrična kubična krivulja s poligonom in ovojnico; označena je točka \(B(\tfrac12)\).*

## Korak 6/6: Kako si krivulja izbere pot

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kako si krivulja izbere pot

[besedilo] Krivulja si pot izbere kot mešanico vseh točk, vsaka vleče z drugo močjo. Zato notranjih točk običajno ne zadene. Konca ostaneta v \(p_0\) in \(p_3\), vse vmes pa je znotraj ovojnice.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kako si krivulja izbere pot

[navodilo za opazovanje] Poskusi narediti krivuljo, ki je skoraj ravna črta. Kam moraš postaviti \(p_1\) in \(p_2\)? Pomagaj si z ovojnico.

[skrito pod 'Kaj bi morali opaziti'] Obe na daljico med \(p_0\) in \(p_3\) ali blizu nje. Ovojnica se tedaj stisne v črto in krivulja ne more drugam.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Vrne se privzeta kubična krivulja s poligonom in ovojnico; vse je prosto za premikanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
