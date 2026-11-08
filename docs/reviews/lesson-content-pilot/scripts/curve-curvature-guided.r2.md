# curve-curvature-guided (lesson script r2)

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Ta krivulja se na začetku zavije bolj kot na koncu. Zakaj? In kako zavoj izmeriš s številom? Pri cestah in železnicah je to pomembno: ko se ukrivljenost nenadoma spremeni, voznik to občuti kot sunek.

## Korak 1/6: Kateri konec se bolj zavije?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec se bolj zavije?

[besedilo] Predstavljaj si, da je krivulja cesta. Začne se pri \(t=0\) in konča pri \(t=1\). V levem zgornjem kotu grafa je izpis »Ukrivljenost κ«: število, ki je večje, kjer je zavoj močnejši. Krožnice in puščic na grafu še ni.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec se bolj zavije?

[navodilo za opazovanje] Napovej, na katerem koncu je zavoj močnejši. Nato s pomočjo drsnika »Parameter t« v razdelku »Uredi« premakni točko na obe krajišči in preberi \(\kappa\) v izpisu na grafu.

[skrito pod 'Kaj bi morali opaziti'] Začetek se zavije dosti bolj: \(\kappa\) je pri \(t=0\) približno 11-krat večja kot pri \(t=1\). Zakaj je tako, bomo ugotovili do konca.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja s kontrolnimi točkami \((0,0)\), \((1,0)\), \((2,1)\), \((3,3)\), točka pri \(t=0{,}5\); v levem zgornjem kotu izpis ukrivljenosti; okvir in krožnica skrita.*

## Korak 2/6: Tangenta se obrača

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Tangenta se obrača

[besedilo] Zdaj sta v točki na krivulji narisani dve puščici: polna s črko \(T\) je tangenta, ki kaže v smeri krivulje, črtkana s črko \(N\) je normala, pravokotna nanjo, ki kaže na stran zavoja. Ko se krivulja zavija, se tangenta obrača.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Tangenta se obrača

[navodilo za opazovanje] Počasi premakni drsnik »Parameter t« od \(0\) do \(1\) in opazuj puščico \(T\). Na katerem delu poti se obrača hitreje, na začetku ali na koncu?

[skrito pod 'Kaj bi morali opaziti'] Na začetku se \(T\) obrne hitro, proti koncu skoraj miruje. Ukrivljenost je mera, kako hitro se tangenta obrača, zato je \(\kappa\) tam večja.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0\); vidni sta polna puščica \(T\) in črtkana puščica \(N\), krožnice ni; izpis zgoraj levo.*

## Korak 3/6: Krivinska krožnica

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krivinska krožnica

[besedilo] Na grafu se je pojavila krožnica. To je krivinska krožnica: tista, ki se krivulji v točki prilega najbolje. Njeno središče leži na normali \(N\), na strani zavoja. Pod ukrivljenostjo v izpisu zgoraj levo je zdaj še vrstica »Krivinski polmer R«, to je polmer te krožnice.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krivinska krožnica

[navodilo za opazovanje] Preberi \(\kappa\) in \(R\) pri \(t=0\) in ju pomnoži. Isto naredi pri \(t=1\). Kaj dobiš in kako se krožnica spremeni?

[skrito pod 'Kaj bi morali opaziti'] Oba produkta sta \(1\), torej je \(R=\dfrac{1}{|\kappa|}\) (\(|\kappa|\) je \(\kappa\) brez predznaka). Pri \(t=1\) je krožnica približno 11-krat večja kot pri \(t=0\) in krivulja je tam skoraj ravna. Začetek je bolj zavit, ker je tam krožnica manjša.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0\); vidni so \(T\), \(N\) in krivinska krožnica; izpis zgoraj levo kaže \(\kappa\), \(R\) in kot tangente.*

## Korak 4/6: Zakaj je začetek bolj zavit?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Zakaj je začetek bolj zavit?

[besedilo] Zdaj vemo, kako zavoj izmerimo. Kaj pa ga povzroči? Krivuljo oblikujejo kontrolne točke, ki so narisane kot pike ob krivulji. Prvi dve ležita na osi \(x\), tretja je nekoliko višje, četrta še višje. Katera od njih odloča o zavoju pri \(t=0\)?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Zakaj je začetek bolj zavit?

[navodilo za opazovanje] Povleci tretjo kontrolno točko po vrsti od začetka (tisto pri \((2,1)\)) navzgor in navzdol ter opazuj \(\kappa\) v izpisu pri \(t=0\). Potem poskusi še s četrto točko.

[skrito pod 'Kaj bi morali opaziti'] Višje ko je tretja točka nad osjo \(x\), večja je \(\kappa\) pri \(t=0\); na osi je \(\kappa=0\), pod njo pa negativna, ker se krivulja zavije na drugo stran. Četrta točka na \(\kappa\) pri \(t=0\) ne vpliva.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0\); vidni so \(T\), \(N\) in krivinska krožnica; kontrolne točke so premakljive.*

## Korak 5/6: Ko zavoj preide v drugo smer

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ko zavoj preide v drugo smer

[besedilo] Na grafu je zdaj druga krivulja, v obliki črke S. Zavija se najprej v eno smer, nato v drugo; predznak \(\kappa\) pove, na katero stran. Kaj se zgodi s krožnico, ko \(\kappa\) preide s plusa na minus? Cestarji zato med ravnino in zavojem vstavijo prehodnico, kjer ukrivljenost narašča postopoma.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ko zavoj preide v drugo smer

[navodilo za opazovanje] Premikaj \(t\) od \(0\) do \(1\) in poišči točko, kjer krožnica izgine. Kje je in kaj se tam nariše namesto nje?

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0{,}5\) krožnice ni, nariše se črtkana premica, v izpisu pa piše, da je ukrivljenost \(0\) in krivinski polmer neskončen. Tej točki pravimo prevoj. Pred njo in za njo je krožnica na nasprotnih straneh krivulje.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja s kontrolnimi točkami \((0,0)\), \((1,2)\), \((2,-2)\), \((3,0)\), točka pri \(t=0{,}2\); vidni so \(T\), \(N\) in krivinska krožnica.*

## Korak 6/6: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Zakaj se je začetek prve krivulje bolj zavil? Zato, ker je tretja kontrolna točka daleč od premice skozi prvi dve: začetek se močno zavije, krivinska krožnica je tam majhna in \(\kappa\) velika. Ukrivljenost je obratna vrednost polmera te krožnice, na prevoju pa je \(0\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Izziv: na paraboli premikaj srednjo kontrolno točko (tisto pod krivuljo) navzgor in navzdol. Kdaj je krožnica v temenu najmanjša in kdaj se spremeni v premico?

[skrito pod 'Kaj bi morali opaziti'] Niže ko je srednja točka, manjša je krožnica v temenu in večja je \(\kappa\). Ko jo dvigaš proti višini krajišč, se krožnica veča; ko so vse tri točke na premici, je krivulja ravna in \(\kappa=0\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Parabola s tremi kontrolnimi točkami, točka v temenu (\(t=0{,}5\)); vidni so \(T\), \(N\) in krivinska krožnica; vse je prosto za raziskovanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
