# subdivision-guided

**Naslov:** Subdivizija Bézierjeve krivulje

**Uvod (viden na prvem koraku, prvem okvirju):** Na grafu je ena krivulja s štirimi kontrolnimi točkami. Ali jo lahko razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, ne da bi se oblika kje spremenila? Risalni programi to počnejo vsakič, ko s škarjami prerežeš pot ali urejaš samo en del črke. Do konca lekcije boš rez naredil sam.

## Korak 1/5: Kje bi rezal?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje bi rezal?

[besedilo] Za rez potrebuješ točko na krivulji. Modra krivulja ima kontrolne točke \(p_0\) do \(p_3\), čez njo pa je narisana mreža daljic in točk: to je shema. Njena zadnja točka \(p_0^3\) leži natanko na krivulji, trenutno na sredini. Ta točka bo mesto reza.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje bi rezal?

[navodilo za opazovanje] Povleci točko \(p_1\) navzgor in nato vstran. Ali točka \(p_0^3\) ostane na krivulji, ali zdrsne z nje?

[skrito pod 'Kaj bi morali opaziti'] Ostane na krivulji, ne glede na to, kam povlečeš \(p_1\). Shema jo vedno izračuna iz trenutnih kontrolnih točk, zato je to zanesljivo mesto za rez.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja z narisano shemo pri \(t=\tfrac12\) (vmesne točke in daljice).*

## Korak 2/5: Premakni rez

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Premakni rez

[besedilo] Zdaj vemo, kje je rez. Kaj pa, če ga nočeš na sredini? Mesto reza določa število \(t\) med 0 in 1; nastaviš ga z drsnikom »Parameter subdivizije t« pod grafom. Del krivulje od reza do konca pri \(p_3\) je pobarvan oranžno, preostanek je moder.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Premakni rez

[navodilo za opazovanje] Najprej ugani: če drsnik \(t\) potisneš v desno, proti 1, bo oranžni del zrasel ali se skrčil? Nato ga premakni in preveri.

[skrito pod 'Kaj bi morali opaziti'] Skrči se. Točka reza potuje po krivulji proti \(p_3\), oranžnega dela je vedno manj. Pri \(t\) blizu 0 je skoraj vsa krivulja oranžna.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Shema se prestavi na \(t=\tfrac{3}{10}\); krivulja ostane ista, vmesne točke se premaknejo, oranžni del je daljši od modrega.*

## Korak 3/5: Kje so nove kontrolne točke?

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Kje so nove kontrolne točke?

[besedilo] Rez je spet na sredini. Levi kos bo Bézierjeva krivulja, torej potrebuje svoje štiri kontrolne točke. Dve že poznaš: začne se v \(p_0\) in konča v točki reza \(p_0^3\). Manjkata še dve, in obe že stojita na grafu, nekje v shemi.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Kje so nove kontrolne točke?

[izračunani primer: Za tiste, ki želijo videti račun: kako nastane shema]
[izračun] \[p_i^{r}=(1-t)\,p_i^{r-1}+t\,p_{i+1}^{r-1}\]
[rezultat] Vsaka točka nove vrstice deli daljico med dvema sosednjima točkama prejšnje vrstice v razmerju \(t\). Pri \(t=\tfrac12\) so to razpolovišča.
[preverjanje] Vrstica 0 so kontrolne točke \(p_0,\dots,p_3\); vrstice 1, 2 in 3 imajo tri, dve in eno točko. Zadnja, \(p_0^3\), je točka na krivulji.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Kje so nove kontrolne točke?

[navodilo za opazovanje] Sledi levemu robu sheme od \(p_0\) do \(p_0^3\). Katere štiri točke srečaš? Nato enako po desnem robu od \(p_3\).

[skrito pod 'Kaj bi morali opaziti'] Levi kos: \(p_0\), \(p_0^1\), \(p_0^2\), \(p_0^3\), v vsaki vrstici prva točka. Desni kos: \(p_0^3\), \(p_1^2\), \(p_2^1\), \(p_3\), v vsaki vrstici zadnja točka. Točko reza si delita.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Shema je spet pri \(t=\tfrac12\); krivulja ista kot na začetku.*

## Korak 4/5: Rez

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Rez

[besedilo] Točke za oba kosa imamo. Gumb »Subdiviziraj« pod grafom, ob drsniku, naredi rez: namesto ene krivulje sta zdaj dve, modra levo in oranžna desno, vsaka s svojimi štirimi kontrolnimi točkami. Shema je po rezu izginila, ker je svoje opravila. Vprašanje z začetka: se je oblika kje spremenila?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Rez

[navodilo za opazovanje] Primerjaj obliko z obliko pred rezom in preštej kontrolne točke. Nato povleci eno kontrolno točko oranžnega kosa: kaj se zgodi z modrim?

[skrito pod 'Kaj bi morali opaziti'] Oblika je enaka; skupaj kosa natanko prekrijeta prejšnjo krivuljo in se stikata v točki reza pri \((0;\ 1{,}5)\). Kontrolnih točk je osem. Ko premakneš točko oranžnega kosa, se spremeni le oranžni kos, modri miruje: to sta zdaj dve neodvisni krivulji.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja je razrezana na dva dela pri \(t=\tfrac12\); levi del je moder, desni oranžen, vsak ima svoje kontrolne točke, shema ni prikazana.*

## Korak 5/5: Da, in kjerkoli hočeš

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Da, in kjerkoli hočeš

[besedilo] Da: krivuljo lahko razrežeš na dva kosa, ki sta spet Bézierjevi krivulji iste stopnje, oblika pa se nikjer ne spremeni. Kontrolne točke kosov so prve in zadnje točke vrstic sheme, mesto reza pa izbereš s \(t\). Tu je krivulja prerezana pri \(t=\tfrac{3}{10}\), zato sta kosa neenaka.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Da, in kjerkoli hočeš

[navodilo za opazovanje] Ugani, kateri kos je krajši, in preveri na grafu. Za konec izziv: povleci kontrolne točke oranžnega kosa tako, da modri kos ostane nedotaknjen, krivulja pa se na stiku zlomi v oster vogal.

[skrito pod 'Kaj bi morali opaziti'] Modri levi kos je krajši, oranžni pokriva preostalih sedem desetin. Vogal nastane, ko kontrolna točka oranžnega kosa ob stiku ne leži več na premici skozi zadnji dve točki modrega kosa. Tako v risalnem programu urejaš en del poti, ne da bi pokvaril drugega.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Krivulja je razrezana na dva neenaka dela pri \(t=\tfrac{3}{10}\); levi del moder, desni oranžen.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
