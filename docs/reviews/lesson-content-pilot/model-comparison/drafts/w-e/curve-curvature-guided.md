# curve-curvature-guided

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Zakaj se začetek te krivulje zavije bolj kot konec? In kako to izmerimo s številom, ki ga potrebuje na primer načrtovalec cest ali risalni program? Odgovor je krožnica, ki jo narišeš v točko krivulje.

## Korak 1/5: Kateri konec se bolj zavije?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec se bolj zavije?

[besedilo] Na grafu je kubična Bézierjeva krivulja, ki jo določajo točke \(p_0\) do \(p_3\). Tak zapis uporabljajo črkovni oblikovalci in risalni programi. Njen levi konec je videti bolj zavit kot desni. Ukrivljenost \(\kappa\) pove, kako zelo se krivulja zavije. Izpis ukrivljenosti je na grafu zgoraj levo.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec se bolj zavije?

[navodilo za opazovanje] Ugani, kolikokrat je začetek bolj ukrivljen od konca. Nato premakni drsnik \(t\) na začetek in na konec ter v izpisu zgoraj levo preberi \(\kappa\).

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0\) je \(\kappa=0{,}6667\), pri \(t=1\) pa \(\kappa=0{,}0596\). Začetek je zavit več kot desetkrat bolj. Večji \(\kappa\) pomeni ostrejši ovinek.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja s točkami \(p_0\) do \(p_3\), točka na krivulji pri \(t=0{,}5\); tangenta, normala in krožnica so skrite, izpis ukrivljenosti je zgoraj levo.*

## Korak 2/5: Krožnica, ki se prilega

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krožnica, ki se prilega

[besedilo] Zdaj vemo, da je \(\kappa\) večji na začetku. Kaj pa ta številka pomeni na sliki? V točko na krivulji lahko narišemo krožnico, ki se ji tam prilega najbolje, krivinsko krožnico. Ostrejši ko je ovinek, manjša je. Zdaj je narisana v točki \(t=0\).

[formula/oznake] \[R=\frac{1}{|\kappa|}\]

[formula/oznake] \(R\) je polmer krivinske krožnice.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krožnica, ki se prilega

[navodilo za opazovanje] Ugani, kaj se bo zgodilo s krožnico, ko drsnik \(t\) počasi pomikaš proti \(1\). Nato ga pomakni in opazuj krožnico ter polmer v izpisu zgoraj levo.

[skrito pod 'Kaj bi morali opaziti'] Krožnica raste in se vse manj zavija: polmer je pri \(t=0\) enak \(1{,}5\), pri \(t=1\) pa že okoli \(16{,}8\). Majhen \(\kappa\) pomeni veliko krožnico.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista kubična krivulja, točka pri \(t=0\); pokaže se krivinska krožnica (polmer \(1{,}5\)), tangenta in normala sta skrita.*

## Korak 3/5: Zakaj je začetek bolj zavit?

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Zakaj je začetek bolj zavit?

[besedilo] Zdaj znamo ovinek izmeriti. Kaj pa ga povzroči? Začetek krivulje se začne v \(p_0\) v smeri proti \(p_1\). Kako hitro se nato obrne, je odvisno od točke \(p_2\): čim dlje je od premice skozi \(p_0\) in \(p_1\), tem prej krivulja zavije.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Zakaj je začetek bolj zavit?

[izračunani primer: Kubična krivulja v začetku, za tiste, ki želijo videti račun]
[izračun] \[\kappa(0)=\frac{2}{3}\cdot\frac{h}{a^{2}}\]
[rezultat] \[\kappa(0)=\frac{2}{3}\ \text{za}\ a=1,\ h=1\]
[preverjanje] \(a\) je razdalja med \(p_0\) in \(p_1\), \(h\) pa razdalja točke \(p_2\) od premice skozi \(p_0\) in \(p_1\). Izpis pri \(t=0\) pokaže \(0{,}6667\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Zakaj je začetek bolj zavit?

[navodilo za opazovanje] Ugani, kaj se zgodi s \(\kappa\) pri \(t=0\), če \(p_2\) potegneš navzgor, stran od premice skozi \(p_0\) in \(p_1\). Nato ga res povleci in glej izpis. Poskusi še s točko \(p_3\).

[skrito pod 'Kaj bi morali opaziti'] Ko je \(p_2\) dlje od premice, \(\kappa\) pri \(t=0\) naraste, krožnica pa se skrči. Premik točke \(p_3\) začetka ne spremeni.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista kubična krivulja, točka pri \(t=0\), krivinska krožnica vidna (\(\kappa=0{,}6667\)); točke \(p_0\) do \(p_3\) je mogoče vleči.*

## Korak 4/5: Kje se ovinek obrne?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kje se ovinek obrne?

[besedilo] Ukrivljenost ima predznak: pozitivna je pri zavoju v levo, negativna pri zavoju v desno. Ta krivulja ima obliko črke S, zato zavije najprej v eno, nato v drugo smer. Mora torej obstajati točka, kjer ni zavita nikamor. Tej pravimo prevoj.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kje se ovinek obrne?

[navodilo za opazovanje] Ugani, pri katerem \(t\) je prevoj. Nato pomikaj drsnik \(t\) čez to točko in glej predznak \(\kappa\) v izpisu ter krožnico.

[skrito pod 'Kaj bi morali opaziti'] Predznak \(\kappa\) se zamenja pri \(t=0{,}5\), kjer je \(\kappa=0\). Namesto krožnice se tam nariše premica, krožnica pa preskoči na drugo stran krivulje.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja v obliki črke S, točka pri \(t=0{,}5\); namesto krožnice je narisana premica (\(\kappa=0\)).*

## Korak 5/5: Največji ovinek na paraboli

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Največji ovinek na paraboli

[besedilo] Zakaj se je začetek zavil bolj kot konec? Zato, ker je bila točka \(p_2\) dlje od premice \(p_0p_1\), in ostrejši ovinek pomeni manjšo krivinsko krožnico. Ukrivljenost je \(\kappa\), polmer pa \(R=1/|\kappa|\). Zdaj je na grafu parabola s tremi kontrolnimi točkami.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Največji ovinek na paraboli

[navodilo za opazovanje] Izziv: premikaj srednjo kontrolno točko \(p_1\) in poišči položaj, pri katerem je krožnica v temenu (\(t=0{,}5\)) najmanjša. Nato jo spusti na premico skozi krajišči \(p_0\) in \(p_2\).

[skrito pod 'Kaj bi morali opaziti'] Dlje ko je \(p_1\) od premice skozi \(p_0\) in \(p_2\), manjša je krožnica v temenu. Na premici je krivulja ravna in \(\kappa=0\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Parabola s točkami \(p_0\), \(p_1\), \(p_2\), točka v temenu (\(t=0{,}5\)), vidni sta tangenta/normala in krivinska krožnica (\(\kappa=2\), polmer \(0{,}5\)); vse je prosto za raziskovanje.*
