# curve-curvature-guided (lesson script r0)

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Ukrivljenost \(\kappa\) meri, koliko se krivulja zavije na enoto dolžine loka. Krivinska krožnica ima polmer \(1/|\kappa|\) in se krivulji v dani točki prilega najbolje od vseh krožnic; tangenta \(T\) in normala \(N\) tvorita ravninski Frenetov koordinatni sistem.

## Korak 1/7: Kateri konec se bolj zavije?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec se bolj zavije?

[besedilo] Kubična krivulja ima kontrolne točke \((0,0)\), \((1,0)\), \((2,1)\), \((3,3)\). Napovej: ali se bolj zavije pri \(t=0\) ali pri \(t=1\)? Okvir in krožnica sta skrita, izpis pa kaže ukrivljenost; zdaj je pri \(t=0{,}5\) enaka \(0{,}2357\).

[formula/oznake] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}},\qquad R=\frac{1}{|\kappa|}\]

[formula/oznake] \((x,y)\) je lega točke na krivulji, črtice pomenijo odvode po parametru, \(R\) je krivinski polmer.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec se bolj zavije?

[navodilo za opazovanje] Z drsnikom \(t\) preberi ukrivljenost pri \(t=0\) in pri \(t=1\).

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0\) je \(\kappa=0{,}6667\), pri \(t=1\) pa \(\kappa=0{,}0596\): začetek se zavije dosti bolj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja z označeno točko pri \(t=0{,}5\) (vrednost \(\kappa=0{,}2357\)); okvir \(T\), \(N\) in krožnica ukrivljenosti sta skrita.*

## Korak 2/7: Tangenta, normala in kot

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Tangenta, normala in kot

[besedilo] Okvir sestavljata enotska tangenta \(T\) in enotska normala \(N\), ki kaže na stran, kamor se krivulja zavija. Napovej smerni kot tangente na koncu krivulje, kjer je \(r'(1)\) vzporeden vektorju \(b_3-b_2=(1,2)\): izpis pri \(t=1\) pokaže \(\varphi\approx63{,}43^\circ\).

[formula/oznake] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}},\qquad R=\frac{1}{|\kappa|}\]

[formula/oznake] \((x,y)\) je lega točke na krivulji, črtice pomenijo odvode po parametru, \(R\) je krivinski polmer.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Tangenta, normala in kot

[navodilo za opazovanje] Premakni \(t\) od \(0\) do \(1\) in opazuj, kako se kot tangente povečuje.

[skrito pod 'Kaj bi morali opaziti'] Kot tangente raste od \(0^\circ\) pri \(t=0\) do \(63{,}43^\circ\) pri \(t=1\); normala je vedno pravokotna na tangento.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Točka se prestavi na \(t=1\); pokaže se okvir (tangenta in normala), krožnice še ni.*

## Korak 3/7: Krivinska krožnica

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krivinska krožnica

[besedilo] Krivinska krožnica se krivulji v dani točki prilega najbolje. Pri \(t=0\) je \(\kappa=2/3\), zato je krivinski polmer \(R=1/\kappa=1{,}5\) in središče je v \((0,\,1{,}5)\). Napovej, kako se bo polmer spremenil, ko se krivulja izravna proti \(t=1\).

[formula/oznake] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}},\qquad R=\frac{1}{|\kappa|}\]

[formula/oznake] \((x,y)\) je lega točke na krivulji, črtice pomenijo odvode po parametru, \(R\) je krivinski polmer.

[formula/oznake] \[c=r+\frac{1}{\kappa}\,N\]

[formula/oznake] \(r\) je točka na krivulji, \(N\) enotska normala, \(c\) središče krivinske krožnice.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krivinska krožnica

[navodilo za opazovanje] Poveči \(t\) in opazuj, kako raste polmer krožnice.

[skrito pod 'Kaj bi morali opaziti'] Ko se ukrivljenost zmanjšuje, krivinski polmer \(R=1/|\kappa|\) raste; pri \(t=1\) je \(R\approx16{,}77\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Točka se prestavi na \(t=0\); poleg okvirja se pokaže tudi krožnica ukrivljenosti (polmer \(1{,}5\)).*

## Korak 4/7: Parabola pri \(x=0\) in \(x=1\)

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Parabola pri \(x=0\) in \(x=1\)

[besedilo] Parabola \(y=x^2\) je narisana kot kvadratna Bézierjeva krivulja; \(x=0\) ustreza \(t=0{,}5\), \(x=1\) pa \(t=1\). Pri \(x=0\) je \(\kappa=2\), \(R=0{,}5\) in središče \((0,\,0{,}5)\). Napovej, kaj se zgodi z ukrivljenostjo pri \(x=1\), in nato nastavi \(t=1\): \(\kappa\approx0{,}1789\), \(R\approx5{,}5902\), središče \((-4,\,3{,}5)\).

[formula/oznake] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}},\qquad R=\frac{1}{|\kappa|}\]

[formula/oznake] \((x,y)\) je lega točke na krivulji, črtice pomenijo odvode po parametru, \(R\) je krivinski polmer.

[formula/oznake] \[c=r+\frac{1}{\kappa}\,N\]

[formula/oznake] \(r\) je točka na krivulji, \(N\) enotska normala, \(c\) središče krivinske krožnice.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Parabola pri \(x=0\) in \(x=1\)

[izračunani primer: Parabola \(y=x^2\) pri \(x=0\)]
[izračun] \[\kappa(0)=\frac{2}{(1+0)^{3/2}}=2,\quad R=\frac12,\quad c=\left(0,\tfrac12\right)\]
[rezultat] \[\kappa=2,\; R=0{,}5\]
[preverjanje] Izpis pokaže \(\kappa=2\) in \(R=0{,}5\); pri \(x=1\) pokaže \(\kappa\approx0{,}1789\) in \(R\approx5{,}5902\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Parabola pri \(x=0\) in \(x=1\)

[navodilo za opazovanje] Nastavi \(t=1\) in primerjaj izpis z vrednostmi v besedilu.

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=1\) izpis pokaže \(\kappa=0{,}1789\) in \(R=5{,}5902\): parabola je tam dosti položnejša kot v temenu.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Prizor preklopi na parabolo, točka v temenu (\(t=0{,}5\)); okvir in krožnica sta vidna (\(\kappa=2\), \(R=0{,}5\)).*

## Korak 5/7: Formula za krajišče

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Formula za krajišče

[besedilo] Za kubično krivuljo je \(n=3\), \(a=|b_1-b_0|=1\) in \(h=1\), saj je \(b_2=(2,1)\) za \(1\) oddaljena od osi \(x\). Napovej \(\kappa(0)=\tfrac23\cdot\tfrac{1}{1}\) in primerjaj z izpisom \(0{,}6667\).

[formula/oznake] \[\kappa(0)=\frac{n-1}{n}\,\frac{h}{a^{2}}\]

[formula/oznake] \(n\) je stopnja Bézierjeve krivulje, \(a=|b_1-b_0|\) dolžina prve stranice kontrolnega poligona in \(h\) razdalja točke \(b_2\) od premice \(b_0b_1\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Formula za krajišče

[izračunani primer: Kubična krivulja v krajišču]
[izračun] \[\kappa(0)=\frac{3-1}{3}\cdot\frac{1}{1^{2}}=\frac23\]
[rezultat] \[\kappa(0)\approx0{,}6667\]
[preverjanje] Kontrolne točke \((0,0)\), \((1,0)\), \((2,1)\), \((3,3)\) dajo \(a=1\) in \(h=1\); izpis pri \(t=0\) pokaže \(\kappa=0{,}6667\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Formula za krajišče

[navodilo za opazovanje] Premakni \(b_2\) navzgor in preveri, da se \(\kappa(0)\) spreminja sorazmerno z \(h\).

[skrito pod 'Kaj bi morali opaziti'] Če se \(h\) podvoji, se podvoji tudi \(\kappa(0)\); \(b_3\) na ukrivljenost v \(t=0\) ne vpliva.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Nazaj na kubično krivuljo, točka pri \(t=0\); okvir in krožnica vidna (\(\kappa=0{,}6667\)).*

## Korak 6/7: Prevoj

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Prevoj

[besedilo] Kubična krivulja v obliki črke S ima kontrolne točke \((0,0)\), \((1,2)\), \((2,-2)\), \((3,0)\). Na prvi polovici se zavija v eno, na drugi v drugo smer, zato mora biti \(\kappa=0\) nekje vmes. Napovej, pri katerem \(t\) je to; pri \(t=0{,}5\) graf pokaže premico namesto krožnice in izpiše, da je krivinski polmer neskončen. Poskusi tudi premikati kontrolne točke.

[formula/oznake] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}},\qquad R=\frac{1}{|\kappa|}\]

[formula/oznake] \((x,y)\) je lega točke na krivulji, črtice pomenijo odvode po parametru, \(R\) je krivinski polmer.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Prevoj

[navodilo za opazovanje] Premakni \(t\) mimo prevoja in opazuj, kako se krožnica obrne na drugo stran.

[skrito pod 'Kaj bi morali opaziti'] Pri prevoju je \(\kappa=0\) in namesto krožnice je narisana tangenta; pred njim in za njim je krožnica na nasprotnih straneh krivulje.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja z prevojem, točka pri \(t=0{,}5\); krožnica postane premica (\(\kappa=0\), polmer neskončen).*

## Korak 7/7: Prosto raziskovanje

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Prosto raziskovanje

[besedilo] Parabola je spet na začetnem mestu. Premikaj kontrolne točke in parameter \(t\) ter opazuj, kako se krivinska krožnica prilega krivulji in kdaj se spremeni v premico.

[formula/oznake] \[\kappa=\frac{x'y''-y'x''}{(x'^2+y'^2)^{3/2}},\qquad R=\frac{1}{|\kappa|}\]

[formula/oznake] \((x,y)\) je lega točke na krivulji, črtice pomenijo odvode po parametru, \(R\) je krivinski polmer.

[formula/oznake] \[c=r+\frac{1}{\kappa}\,N\]

[formula/oznake] \(r\) je točka na krivulji, \(N\) enotska normala, \(c\) središče krivinske krožnice.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Prosto raziskovanje

[navodilo za opazovanje] Premakni srednjo kontrolno točko in poišči položaj, pri katerem je ukrivljenost v \(t=0{,}5\) največja.

[skrito pod 'Kaj bi morali opaziti'] Bližje ko je srednja točka krivulji, večja je ukrivljenost v temenu; krožnica se tam skrči.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Parabola, točka v temenu, okvir in krožnica vidna; vse je prosto za raziskovanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
