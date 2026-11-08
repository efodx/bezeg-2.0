# curve-curvature-guided

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Na grafu je krivulja, ki se na začetku ostro zavije, proti koncu pa se skoraj izravna. Zakaj se začetek zavije bolj kot konec, in kako to »bolj« izmerimo s številom? Do konca lekcije boš znal zavoj izmeriti, ga narisati kot krožnico in najti točko, kjer krivulja zavoj zamenja.

## Korak 1/7: Kateri konec se bolj zavije?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec se bolj zavije?

[besedilo] Cestni inženir mora vedeti, kako oster je ovinek, oblikovalec pisav pa, kako ostro se zavije črka. Oboje meri isto število: ukrivljenost. V izpisu zgoraj levo na grafu piše »Ukrivljenost κ = …« za točko, ki jo izbereš z drsnikom Parameter \(t\) pod grafom. Poglej krivuljo in ugani: kje bo to število večje, na začetku pri \(t=0\) ali na koncu pri \(t=1\)?

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec se bolj zavije?

[navodilo za opazovanje] Povleci drsnik Parameter \(t\) najprej čisto na levo (\(t=0\)) in nato čisto na desno (\(t=1\)). Vsakič preberi ukrivljenost v izpisu zgoraj levo.

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0\) je ukrivljenost približno \(0{,}67\), pri \(t=1\) pa le okoli \(0{,}06\). Začetek se zavije več kot desetkrat bolj: večje število pomeni ostrejši zavoj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja s kontrolnimi točkami \(p_0\) do \(p_3\), označena točka pri \(t=0{,}5\); okvir in krožnica sta skrita, izpis zgoraj levo kaže ukrivljenost.*

## Korak 2/7: V katero smer gleda krivulja?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] V katero smer gleda krivulja?

[besedilo] Zdaj veš, da se začetek zavije bolj. Kaj pa se pri zavoju sploh spreminja? Smer. Na grafu sta se v izbrani točki pokazali dve puščici: tangenta \(T\) kaže smer gibanja po krivulji, normala \(N\) pa je nanjo pravokotna. V izpisu je nova vrstica »Smerni kot tangente φ«: kot, ki ga \(T\) oklepa z vodoravno smerjo. Ugani: za koliko stopinj se smer zasuka od začetka do konca?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] V katero smer gleda krivulja?

[navodilo za opazovanje] Povleci drsnik \(t\) počasi od \(0\) do \(1\) in opazuj puščico \(T\) ter vrstico s kotom \(\varphi\). Kje se kot spreminja hitro in kje počasi?

[skrito pod 'Kaj bi morali opaziti'] Kot raste od \(0^\circ\) pri \(t=0\) do približno \(63^\circ\) pri \(t=1\). Na začetku se spreminja hitro, proti koncu komaj še. Ukrivljenost meri prav to: kako hitro se vrti tangenta glede na prepotovano pot.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista kubična krivulja, točka pri \(t=1\); pokažeta se puščici \(T\) in \(N\), krožnice še ni.*

## Korak 3/7: Zavoj kot krožnica

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Zavoj kot krožnica

[besedilo] Hitro vrtenje tangente je težko videti. Lažje je videti krožnico. V izbrani točki se je pokazala krožnica, ki se krivulji prilega bolje od vseh drugih: krivinska krožnica. Oster zavoj dobi majhno krožnico, položen velik. Njen polmer piše v izpisu kot »Krivinski polmer R«. Ugani: ko boš \(t\) pomikal proti \(1\), bo krožnica rasla ali se krčila?

[formula/oznake] \[R=\frac{1}{|\kappa|}\]

[formula/oznake] \(R\) je polmer krivinske krožnice, \(\kappa\) ukrivljenost iz izpisa. Večja ukrivljenost pomeni manjšo krožnico.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Zavoj kot krožnica

[navodilo za opazovanje] Preberi polmer \(R\) pri \(t=0\), nato počasi povečuj \(t\) in glej krožnico ter vrstico s polmerom.

[skrito pod 'Kaj bi morali opaziti'] Krožnica raste, polmer pa z \(1{,}5\) pri \(t=0\) naraste na več kot \(16\) pri \(t=1\). Krožnica vedno leži na tisti strani krivulje, v katero krivulja zavija.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Točka se prestavi na \(t=0\); poleg \(T\) in \(N\) je vidna krivinska krožnica s polmerom \(1{,}5\).*

## Korak 4/7: Preizkus na znani krivulji

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Preizkus na znani krivulji

[besedilo] Ali ta krožnica res meri zavoj? Preverimo na krivulji, ki jo poznaš: paraboli \(y=x^2\). Na grafu je narisana kot kvadratna Bézierjeva krivulja; drsnik \(t=0{,}5\) te postavi v teme, \(t=1\) pa v točko \(x=1\). V temenu je parabola najbolj zavita. Ugani: kolikokrat večja bo krožnica pri \(x=1\) kot v temenu, dvakrat, petkrat, desetkrat?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Preizkus na znani krivulji

[izračunani primer: Za tiste, ki želijo videti račun: parabola \(y=x^2\) v temenu]
[izračun] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}},\qquad \kappa(0)=\frac{2}{(1+0)^{3/2}}=2\]
[rezultat] \[R=\frac{1}{2}=0{,}5\]
[preverjanje] Črtice pomenijo odvode po parametru. Izpis zgoraj levo pri \(t=0{,}5\) pokaže isti vrednosti \(\kappa=2\) in \(R=0{,}5\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Preizkus na znani krivulji

[navodilo za opazovanje] Preberi polmer \(R\) v temenu, nato nastavi drsnik \(t\) na \(1\) in ga preberi znova. Primerjaj z ugibanjem.

[skrito pod 'Kaj bi morali opaziti'] Polmer zraste z \(0{,}5\) na približno \(5{,}6\), torej več kot desetkrat. Parabola je pri \(x=1\) dosti položnejša kot v temenu, krožnica pa to natančno pokaže.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Prizor preklopi na parabolo, točka v temenu (\(t=0{,}5\)); \(T\), \(N\) in krožnica so vidni (\(\kappa=2\), \(R=0{,}5\)).*

## Korak 5/7: Kdo določa zavoj na začetku?

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Kdo določa zavoj na začetku?

[besedilo] Nazaj k naši krivulji. Zdaj znaš zavoj izmeriti; lahko ga tudi nastaviš? Začetek krivulje je pri \(p_0\), prva stranica kontrolnega poligona pa vodi do \(p_1\). Krivulja se zavije zato, ker \(p_2\) ne leži na tej stranici. Ugani: če \(p_2\) povlečeš višje, se bo krožnica pri \(t=0\) skrčila ali povečala? In ali bo premik \(p_3\) nanjo sploh vplival?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Kdo določa zavoj na začetku?

[izračunani primer: Za tiste, ki želijo videti račun: ukrivljenost v krajišču]
[izračun] \[\kappa(0)=\frac{n-1}{n}\,\frac{h}{a^{2}}=\frac{2}{3}\cdot\frac{1}{1^{2}}\]
[rezultat] \[\kappa(0)=\frac{2}{3}\approx0{,}6667\]
[preverjanje] \(n=3\) je stopnja krivulje, \(a\) dolžina stranice od \(p_0\) do \(p_1\), \(h\) razdalja točke \(p_2\) od premice skozi \(p_0\) in \(p_1\). Izpis pri \(t=0\) pokaže \(0{,}6667\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Kdo določa zavoj na začetku?

[navodilo za opazovanje] Drsnik pusti pri \(t=0\). Povleci \(p_2\) navzgor in glej krožnico ter vrstico »Ukrivljenost κ«. Nato premakni še \(p_3\).

[skrito pod 'Kaj bi morali opaziti'] Višji \(p_2\) pomeni večjo ukrivljenost in manjšo krožnico; če je \(p_2\) dvakrat dlje od stranice \(p_0p_1\), je ukrivljenost dvakrat večja. Premik \(p_3\) izpisa pri \(t=0\) ne spremeni: zavoj na začetku določajo le prve tri kontrolne točke.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Nazaj na kubično krivuljo, točka pri \(t=0\); \(T\), \(N\) in krožnica so vidni (\(\kappa=0{,}6667\)).*

## Korak 6/7: Kje krivulja zamenja zavoj?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje krivulja zamenja zavoj?

[besedilo] Doslej je krivulja zavijala vedno v isto stran. Na grafu je zdaj krivulja v obliki črke S: na prvi polovici zavija v eno, na drugi v drugo smer. Nekje vmes mora biti točka, kjer ne zavija nikamor: prevoj. Ugani, kaj bo tam narisano namesto krožnice in kaj bo pisalo v izpisu. Ugani tudi, pri katerem \(t\) se to zgodi.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje krivulja zamenja zavoj?

[navodilo za opazovanje] Povleci drsnik \(t\) z \(0{,}3\) čez \(0{,}5\) do \(0{,}7\) in glej, kaj se zgodi s krožnico in z izpisom zgoraj levo.

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0{,}5\) je ukrivljenost \(0\): namesto krožnice je narisana premica, izpis pa pove, da je krivinski polmer neskončen. Tik pred prevojem krožnica leži na eni strani krivulje, tik za njim preskoči na drugo.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja v obliki črke S, točka pri \(t=0{,}5\); namesto krožnice je premica (\(\kappa=0\), polmer neskončen).*

## Korak 7/7: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Zato, ker se na začetku tangenta vrti hitro, na koncu pa komaj še. To »bolj« meri ukrivljenost \(\kappa\) v izpisu zgoraj levo; narisana je kot krivinska krožnica s polmerom \(R=1/|\kappa|\), ki je pri ostrem zavoju majhna, pri položnem velika in pri prevoju postane premica. Zavoj v krajišču nastaviš s prvimi tremi kontrolnimi točkami. Na grafu je spet parabola, za izziv.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Drsnik pusti pri \(t=0{,}5\). Premikaj srednjo kontrolno točko \(p_1\) in poišči lego, pri kateri je krožnica v temenu najmanjša. Nato preveri, ali jo lahko spremeniš v premico.

[skrito pod 'Kaj bi morali opaziti'] Dlje ko je \(p_1\) od zveznice \(p_0p_2\), ostrejše je teme in manjša je krožnica. Ko \(p_1\) položiš na zveznico \(p_0p_2\), krivulja postane ravna črta: ukrivljenost je \(0\) in krožnica se spremeni v premico.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Parabola, točka v temenu, \(T\), \(N\) in krožnica vidni; vse je prosto za raziskovanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
