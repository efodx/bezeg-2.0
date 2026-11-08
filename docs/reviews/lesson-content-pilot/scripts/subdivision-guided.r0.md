# subdivision-guided (lesson script r0)

**Naslov:** Subdivizija Bézierjeve krivulje

**Uvod (viden na prvem koraku, prvem okvirju):** Decasteljaujeva shema pri parametru \(t\) krivuljo razreže na dva dela, ki sta spet Bézierjevi krivulji iste stopnje. Njune kontrolne točke so prve in zadnje točke vrstic sheme, skupaj pa natančno prekrijeta izvirno krivuljo.

## Korak 1/5: Ena krivulja, shema pri \(t\)

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ena krivulja, shema pri \(t\)

[besedilo] Prikazana je privzeta krivulja s shemo pri \(t=\tfrac12\). Shema ima tri vrstice vmesnih točk in na koncu točko \(B(t)\) na krivulji. Isto shemo bomo uporabili za rez.

[formula/oznake] \[b_i^0=P_i,\qquad b_i^r=(1-t)\,b_i^{r-1}+t\,b_{i+1}^{r-1},\qquad r=1,\dots,n,\quad i=0,\dots,n-r\]

[formula/oznake] Vrstica \(r\) sheme vsebuje točke \(b_i^r\); \(n\) je stopnja krivulje, \(P_i\) so kontrolne točke, \(t\) pa parameter subdivizije.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ena krivulja, shema pri \(t\)

[navodilo za opazovanje] Poišči točko \(B(t)\), kjer se shema konča, in preštej vrstice vmesnih točk.

[skrito pod 'Kaj bi morali opaziti'] Prikazana je ena krivulja s štirimi kontrolnimi točkami in shemo; točka sheme na krivulji je na sredini.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Privzeta krivulja z narisano shemo de Casteljauja pri \(t=\tfrac12\) (vmesne točke in daljice).*

## Korak 2/5: Mesto reza \(t\)

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Mesto reza \(t\)

[besedilo] Parameter \(t\) določa, kje krivuljo razrežemo. Pri \(t=\tfrac{3}{10}\) je rez bliže začetku, oranžni del pa je preostanek krivulje na \([t,1]\).

[formula/oznake] \[L(u)=B(tu),\qquad R(u)=B\bigl(t+(1-t)u\bigr),\qquad u\in[0,1]\]

[formula/oznake] Parameter \(u\) teče po vsakem delu od 0 do 1, parameter \(t\) pa je mesto reza na izvirni krivulji.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Mesto reza \(t\)

[navodilo za opazovanje] Premakni drsnik \(t\) in spremljaj, kako se premika točka reza in kako se spreminja oranžni del.

[skrito pod 'Kaj bi morali opaziti'] Točka reza je pri \(t=\tfrac{3}{10}\) bliže začetku krivulje; oranžni del je daljši od modrega.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Shema se prestavi na \(t=\tfrac{3}{10}\); krivulja ostane ista, vmesne točke se premaknejo.*

## Korak 3/5: Kontrolne točke iz sheme

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Kontrolne točke iz sheme

[besedilo] Pri \(t=\tfrac12\) je prva točka vsake vrstice kontrolna točka levega dela, zadnja točka vsake vrstice pa kontrolna točka desnega dela. Za privzeto krivuljo dobimo levo \((-4,-3)\), \(\bigl(-\tfrac72,0\bigr)\), \(\bigl(-\tfrac74,\tfrac32\bigr)\), \(\bigl(0,\tfrac32\bigr)\).

[formula/oznake] \[\text{left: } b_0^0,b_0^1,\dots,b_0^n,\qquad \text{right: } b_0^n,b_1^{n-1},\dots,b_n^0\]

[formula/oznake] Levi del vzame prvo točko vsake vrstice, desni del zadnjo točko vsake vrstice, v obratnem vrstnem redu.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Kontrolne točke iz sheme

[izračunani primer: Primer: privzeta krivulja, \(t=\tfrac12\)]
[izračun] \[P=(-4,-3),(-3,3),(3,3),(4,-3);\quad b^1=\bigl(-\tfrac72,0\bigr),(0,3),\bigl(\tfrac72,0\bigr);\quad b^2=\bigl(-\tfrac74,\tfrac32\bigr),\bigl(\tfrac74,\tfrac32\bigr);\quad b^3=\bigl(0,\tfrac32\bigr)\]
[rezultat] \[\text{left: }(-4,-3),\bigl(-\tfrac72,0\bigr),\bigl(-\tfrac74,\tfrac32\bigr),\bigl(0,\tfrac32\bigr);\quad \text{right: }\bigl(0,\tfrac32\bigr),\bigl(\tfrac74,\tfrac32\bigr),\bigl(\tfrac72,0\bigr),(4,-3)\]
[preverjanje] Skupna točka \(\bigl(0,\tfrac32\bigr)\) je \(B(\tfrac12)\), desni del pa je zrcalna slika levega, ker je privzeta krivulja simetrična.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Kontrolne točke iz sheme

[navodilo za opazovanje] Poišči v shemi točke \(\bigl(-\tfrac72,0\bigr)\) in \(\bigl(0,\tfrac32\bigr)\) ter ugotovi, kateri vrstici pripadata.

[skrito pod 'Kaj bi morali opaziti'] Točka \(\bigl(-\tfrac72,0\bigr)\) je prva točka prve vrstice, točka \(\bigl(0,\tfrac32\bigr)\) pa je zadnja vrstica, torej \(B(\tfrac12)\) na krivulji.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Shema je spet pri \(t=\tfrac12\); krivulja ista kot na začetku.*

## Korak 4/5: Rez na sredini

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Rez na sredini

[besedilo] Gumb Subdiviziraj pri \(t=\tfrac12\) nadomesti krivuljo z dvema. Levi del je \(L(u)=B(\tfrac{u}{2})\), desni del pa \(R(u)=B\bigl(\tfrac{1+u}{2}\bigr)\). Skupaj natanko prekrijeta izvirno krivuljo, ki se ni spremenila.

[formula/oznake] \[L(u)=B(tu),\qquad R(u)=B\bigl(t+(1-t)u\bigr),\qquad u\in[0,1]\]

[formula/oznake] Parameter \(u\) teče po vsakem delu od 0 do 1, parameter \(t\) pa je mesto reza na izvirni krivulji.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Rez na sredini

[navodilo za opazovanje] Preveri, da je oblika enaka kot pred rezom, in poišči skupno točko obeh delov.

[skrito pod 'Kaj bi morali opaziti'] Prikazani sta dve krivulji z osmimi kontrolnimi točkami; oblika je enaka, skupna točka je \(\bigl(0,\tfrac32\bigr)\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja je razrezana na dva dela pri \(t=\tfrac12\); vsak del ima svoje kontrolne točke.*

## Korak 5/5: Neenak rez in omejitve

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Neenak rez in omejitve

[besedilo] Pri \(t=\tfrac{3}{10}\) je levi del \(B(\tfrac{3u}{10})\), krajši interval parametra, desni pa \(B(\tfrac{3}{10}+\tfrac{7u}{10})\). Po rezu se parameter \(t\) postavi na 1 in shema se skrije; za nov rez najprej izberi nov \(t\). Drsnik sega le od 0,01 do 0,99, ker se pri \(t=0\) ali \(t=1\) del skrči v točko.

[formula/oznake] \[L(u)=B(tu),\qquad R(u)=B\bigl(t+(1-t)u\bigr),\qquad u\in[0,1]\]

[formula/oznake] Parameter \(u\) teče po vsakem delu od 0 do 1, parameter \(t\) pa je mesto reza na izvirni krivulji.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Neenak rez in omejitve

[navodilo za opazovanje] Primerjaj velikost obeh delov in preveri, da ima njuna skupna točka koordinate \(B(\tfrac{3}{10})\).

[skrito pod 'Kaj bi morali opaziti'] Levi del je krajši od desnega; skupna točka je približno \((-2{,}02;\ 0{,}78)\), shema je skrita, drsnik pa je na 1.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Krivulja je razrezana na dva neenaka dela pri \(t=\tfrac{3}{10}\).*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
