# subdivision-guided

**Naslov:** Subdivizija Bézierjeve krivulje

**Uvod (viden na prvem koraku, prvem okvirju):** Pisave in risalni programi oblike pogosto shranjujejo kot Bézierjeve krivulje. Ali lahko eno takšno krivuljo razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, pa se oblika ne spremeni?

## Korak 1/5: Ena krivulja in njena shema

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ena krivulja in njena shema

[besedilo] Na zaslonu je ena Bézierjeva krivulja, ki jo določajo kontrolne točke \(p_0\), \(p_1\), \(p_2\) in \(p_3\). Pri \(t=\tfrac12\) je narisana shema de Casteljauja: vmesne točke in daljice, ki se končajo v eni točki na krivulji. Na vprašanje z začetka bomo odgovorili s pomočjo te sheme.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ena krivulja in njena shema

[navodilo za opazovanje] Napovej, ali se bo oblika krivulje po rezu spremenila. Zapomni si svoj odgovor.

[skrito pod 'Kaj bi morali opaziti'] Ključ je v shemi. Odgovor bo jasnejši, ko vidiš, kaj se s shemo zgodi, ko premakneš drsnik \(t\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja z narisano shemo de Casteljauja pri \(t=\tfrac12\) (vmesne točke in daljice).*

## Korak 2/5: Kje bi krivuljo razrezal

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje bi krivuljo razrezal

[besedilo] Zdaj vemo, da je ključ v shemi. Točka na krivulji, kjer se shema konča, je mesto, kjer bi krivuljo razrezali. Drsnik \(t\) to točko premika po krivulji.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje bi krivuljo razrezal

[navodilo za opazovanje] Napovej, ali se bo krivulja spremenila, ko premakneš drsnik \(t\). Nato premakni drsnik \(t\) na \(\tfrac{3}{10}\) in opazuj shemo ter krivuljo.

[skrito pod 'Kaj bi morali opaziti'] Krivulja ostane ista. Vmesne točke sheme se premaknejo, točka na krivulji, kjer se shema konča, pa se pri \(t=\tfrac{3}{10}\) pomakne bliže začetku krivulje.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Shema se prestavi na \(t=\tfrac{3}{10}\); krivulja ostane ista, vmesne točke se premaknejo.*

## Korak 3/5: Kontrolne točke iz robov sheme

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kontrolne točke iz robov sheme

[besedilo] Zdaj vemo, da je mesto reza točka, kjer se shema konča. Kaj pa so kontrolne točke novih delov? Shema je sestavljena iz vrstic točk, vsaka naslednja vrstica ima eno točko manj.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kontrolne točke iz robov sheme

[navodilo za opazovanje] Premakni drsnik \(t\) nazaj na \(\tfrac12\). Napovej, katere točke sheme bodo kontrolne točke levega dela.

[skrito pod 'Kaj bi morali opaziti'] Levi rob sheme sestavljajo prve točke vseh vrstic: \(p_0\), \(p_0^1\), \(p_0^2\) in \(p_0^3\). To so kontrolne točke levega dela. Desni rob sestavljajo zadnje točke vrstic, od \(p_3\) do iste točke na krivulji; to so kontrolne točke desnega dela. Točke sheme označimo s \(p_i^r\): \(r\) pove, katera vrstica, \(i\) pa mesto v njej.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Shema je spet pri \(t=\tfrac12\); krivulja ista kot na začetku.*

## Korak 4/5: Rez na sredini

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Rez na sredini

[besedilo] Zdaj vemo, od kod pridejo nove kontrolne točke. Kaj pa se zgodi s krivuljo po rezu? Pri \(t=\tfrac12\) gumb z napisom Subdiviziraj razreže krivuljo na levi in desni del.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Rez na sredini

[izračunani primer: Primer: privzeta krivulja, \(t=\tfrac12\)]

[izračun] \[p_0^1=(1-t)\,p_0+t\,p_1=\tfrac12\bigl((-4,-3)+(-3,3)\bigr)=\bigl(-\tfrac72,\,0\bigr)\]

[preverjanje] Enako dobiš ostale točke levega roba. Točka \(p_0^3\) je točka na krivulji pri \(t=\tfrac12\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Rez na sredini

[navodilo za opazovanje] Zdaj, ko veš, od kod pridejo kontrolne točke, napovej, ali se bo oblika po rezu spremenila. Nato pritisni gumb z napisom Subdiviziraj in primerjaj krivuljo pred in po rezu.

[skrito pod 'Kaj bi morali opaziti'] Oblika ostane ista. Krivulja je razrezana na dva dela, ki se stikata v točki, kjer se je prej končala shema. Vsak del ima svoje kontrolne točke.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja je razrezana na dva dela pri \(t=\tfrac12\); vsak del ima svoje kontrolne točke.*

## Korak 5/5: Rez ni vedno na sredini

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Rez ni vedno na sredini

[besedilo] Da. Zdaj vemo, da rez na sredini ohrani obliko. Kaj pa pri drugem \(t\)? Enako velja pri katerem koli \(t\) med \(0\) in \(1\): oba kosa sta spet Bézierjevi krivulji s štirimi kontrolnimi točkami, njune kontrolne točke pa so točke na robovih sheme.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Rez ni vedno na sredini

[navodilo za opazovanje] Napovej, kateri del bo krajši, če rez postaviš pri \(t=\tfrac{3}{10}\). Nato premakni drsnik \(t\) na \(\tfrac{3}{10}\) in pritisni gumb z napisom Subdiviziraj.

[skrito pod 'Kaj bi morali opaziti'] Levi del je krajši od desnega. Oba dela se še vedno stikata v točki na krivulji, kjer je zdaj rez. Izziv za prosto raziskovanje: izberi \(t\) nad \(\tfrac12\) in primerjaj dela.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Krivulja je razrezana na dva neenaka dela pri \(t=\tfrac{3}{10}\).*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
