# subdivision-guided

**Naslov:** Subdivizija Bézierjeve krivulje

**Uvod (viden na prvem koraku, prvem okvirju):** Ali lahko Bézierjevo krivuljo prerežeš na dva kosa, ki sta spet Bézierjevi krivulji, oblika pa ostane ista? In kje dobiš kontrolne točke obeh kosov?

## Korak 1/5: Ena krivulja, dva kosa

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ena krivulja, dva kosa

[besedilo] Na grafu je bila ena sama krivulja. Zdaj je prerezana na modri in oranžni kos. Ali je vsak kos spet prava Bézierjeva krivulja s svojimi kontrolnimi točkami? Takšen rez naredi risarski program, ko na pot dodaš novo vozlišče ali jo razdeliš z nožem.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ena krivulja, dva kosa

[navodilo za opazovanje] Napovej, koliko kontrolnih točk ima vsak kos, nato jih preštej. Potem povleci eno od točk oranžnega kosa, ki ne leži na krivulji, in opazuj oba kosa.

[skrito pod 'Kaj bi morali opaziti'] Vsak kos ima štiri kontrolne točke, tako kot prej cela krivulja. Oranžni kos se ob vleku upogne kot vsaka Bézierjeva krivulja, modri ostane na mestu. Na stičišču ležita dve točki ena na drugi: konec modrega in začetek oranžnega kosa.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja, prerezana pri \(t=\tfrac12\): levi kos je moder, desni oranžen, vsak ima svoje kontrolne točke.*

## Korak 2/5: Kje je rez

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje je rez

[besedilo] Zdaj vemo, da ima vsak kos štiri točke. Od kod pridejo? Iz Decasteljaujeve sheme. Na grafu je spet cela krivulja s kontrolnimi točkami \(p_0\) do \(p_3\). Pri \(t=\tfrac12\) shema razpolovi vsako stranico kontrolnega poligona: to je prva vrstica. Iste korake ponoviš na novih daljicah. Zgornji indeks pri \(p_i^r\) pove, v kateri vrstici je točka.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje je rez

[navodilo za opazovanje] Sledi vrsticam od \(p_0^1\), \(p_1^1\), \(p_2^1\) navzdol do zadnje točke \(p_0^3\). Napovej, kje leži, nato poglej, kaj se na tem mestu zgodi z barvo krivulje.

[skrito pod 'Kaj bi morali opaziti'] Točka \(p_0^3\) leži na krivulji. Tam se modri del krivulje konča in začne oranžni: \(p_0^3\) je točka reza.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta cela krivulja s shemo pri \(t=\tfrac12\); krivulja je modra do točke \(p_0^3\) in oranžna od nje naprej.*

## Korak 3/5: Točke za oba kosa

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Točke za oba kosa

[besedilo] Zdaj vemo, kje je rez. Katere točke sheme pa postanejo kontrolne točke modrega kosa? Modri kos se začne v \(p_0\) in konča v \(p_0^3\). Vmes potrebuje še dve točki: eno, ki pove, v katero smer krivulja zapusti začetek, in eno, ki pove, od kod prispe v rez.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Točke za oba kosa

[navodilo za opazovanje] Napovej, kateri dve točki sheme sta še kontrolni točki modrega kosa, in ju poišči na grafu.

[skrito pod 'Kaj bi morali opaziti'] Modri kos ima kontrolne točke \(p_0\), \(p_0^1\), \(p_0^2\), \(p_0^3\): prvo točko vsake vrstice. Oranžni kos vzame zadnjo točko vsake vrstice: \(p_0^3\), \(p_1^2\), \(p_2^1\), \(p_3\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Točke za oba kosa

[izračunani primer: Za tiste, ki želijo videti račun: privzeta krivulja, \(t=\tfrac12\)]
[izračun] \[p_i^r=(1-t)\,p_i^{r-1}+t\,p_{i+1}^{r-1}:\quad p^1=\bigl(-\tfrac72,0\bigr),(0,3),\bigl(\tfrac72,0\bigr);\quad p^2=\bigl(-\tfrac74,\tfrac32\bigr),\bigl(\tfrac74,\tfrac32\bigr);\quad p_0^3=\bigl(0,\tfrac32\bigr)\]
[rezultat] \[\text{modri: }(-4,-3),\bigl(-\tfrac72,0\bigr),\bigl(-\tfrac74,\tfrac32\bigr),\bigl(0,\tfrac32\bigr);\quad \text{oranžni: }\bigl(0,\tfrac32\bigr),\bigl(\tfrac74,\tfrac32\bigr),\bigl(\tfrac72,0\bigr),(4,-3)\]
[preverjanje] Oranžni kos je zrcalna slika modrega, ker je privzeta krivulja simetrična glede na os \(y\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta cela krivulja s shemo pri \(t=\tfrac12\), kot v prejšnjem koraku.*

## Korak 4/5: Rez, kjer hočeš

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Rez, kjer hočeš

[besedilo] Zdaj znaš prebrati točke obeh kosov. Ali rez deluje tudi drugje kot na sredini? Drsnik Parameter subdivizije t v plošči Orodja premika mesto reza: točka \(p_0^3\) drsi po krivulji, shema pa se sproti prilagaja. Gumb Subdiviziraj krivuljo res prereže po pravilu iz prejšnjega koraka.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Rez, kjer hočeš

[navodilo za opazovanje] Postavi drsnik \(t\), kamor želiš, in si zapomni obliko krivulje. Napovej, ali se bo oblika spremenila, nato pritisni Subdiviziraj.

[skrito pod 'Kaj bi morali opaziti'] Oblika ostane natanko ista. Modri in oranžni kos se stakneta v točki, kjer je bila \(p_0^3\). Tudi krajši kos ima štiri kontrolne točke, le bližje skupaj. Shema se po rezu skrije, ker je svoje delo opravila.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta cela krivulja s shemo pri \(t=\tfrac{3}{10}\); učenec sam izbere \(t\) in pritisne Subdiviziraj.*

## Korak 5/5: Da, in točke so v shemi

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Da, in točke so v shemi

[besedilo] Da. Decasteljaujeva shema pri \(t\) krivuljo prereže na dva kosa, ki sta spet Bézierjevi krivulji iste stopnje, oblika pa ostane ista. Modri kos vzame prvo točko vsake vrstice, oranžni zadnjo. Tako risarski program doda vozlišče na pot, ne da bi jo premaknil.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Da, in točke so v shemi

[navodilo za opazovanje] Izziv: povleci drugo točko oranžnega kosa, prvo za stičiščem, vstran, da se na stičišču pojavi vogal. Nato jo postavi tako, da bo stik spet gladek.

[skrito pod 'Kaj bi morali opaziti'] Stik je gladek, ko ta točka leži na podaljšku daljice od predzadnje točke modrega kosa skozi stičišče. Pred rezom sta bili to točki \(p_0^2\) in \(p_1^2\) iz druge vrstice, ki ležita na isti daljici kot \(p_0^3\), zato je stik po rezu vedno gladek.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Privzeta krivulja, prerezana pri \(t=\tfrac{3}{10}\): krajši modri kos in daljši oranžni kos.*
