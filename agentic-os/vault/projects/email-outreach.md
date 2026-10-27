# Kalla mejl: uppsättningen

Planen för automatiska kalla mejl för Driv Kundesenter. Jarvis bygger kampanjen,
utskicksverktyget skickar, du granskar, startar och ringer.

## Modellen
1. **/lead-research** hittar norska företag med en allmän adress (post@, kontakt@) och en äkta
   observation, plus beslutsfattarens namn och telefonnummer.
2. **/campaign** bygger veckans kampanj: en CSV med en personlig första rad per företag och en
   sekvens i fyra steg på bokmål (dag 0, 3, 7 och 14).
3. **Du** kollar filen, laddar upp den i utskicksverktyget och trycker start. Ungefär 15 minuter i veckan.
4. **Utskicksverktyget** skickar från separata, uppvärmda inkorgar och slutar när någon svarar.
5. **Svar** besvarar du samma dag, från verktygets inkorg eller din egen adress.
6. **Inget svar efter sekvensen?** /call-list lägger beslutsfattaren på ringlistan.
7. **/sync-pipeline** läser verktygets export (lägg den i `inbox/` med ett namn som börjar på
   `kampanj`) så att siffrorna i HUD:en stämmer.

## Varför inte skicka allt från din adress
Din adress (naim.amara@ på Drivs domän) delar rykte med hela Driv. Om många kalla mejl därifrån
markeras som skräp kan Drivs vanliga mejl, offerter och fakturor börja hamna i skräpposten.
Därför: din adress för svar, offerter och högst ~30 personliga mejl om dagen. Volymen går från
2–3 separata domäner som Driv godkänner och helst äger. En .no-domän kräver ett norskt
organisationsnummer, så den får Driv registrera.

## Lagen (Norge)
Kalla mejl bara till allmänna företagsadresser. Mejl till en namngiven persons jobbadress kräver
samtycke enligt Forbrukertilsynets veiledning (markedsføringsloven § 15). Hoppa över
enkeltpersonforetak. Se `wiki/sales-playbook.md`.

## Kostnad (ungefär, kolla aktuella priser innan du köper)
| Del | Antal | Pris | Per månad |
| --- | --- | --- | --- |
| Domäner (.com) | 3 | ca 10–15 USD per år styck | ca 40 kr |
| Inkorgar (Google Workspace Business Starter) | 6 (2 per domän) | 7 USD/mån styck med årsavtal, 8,40 utan | ca 450–550 kr |
| Instantly Growth (5 000 mejl/mån, 1 000 kontakter, uppvärmning ingår) | 1 | 47 USD/mån, 37,60 med årsavtal | ca 400–500 kr |
| **Totalt** | | | **ca 900–1 100 kr** |

Alternativ till Instantly: Smartlead Basic, 39 USD/mån (6 000 mejl, 2 000 kontakter).
En Small-affär ger dig 5 000 NOK, så en affär i kvartalet betalar verktygen. Det är ändå inget
löfte om affärer: räkna med låga svarsfrekvenser från allmänna adresser tills Takt visar dina
egna siffror.

Kapacitet: 6 inkorgar × 30 mejl om dagen × ca 21 vardagar ≈ 3 800 mejl i månaden. Med fyra
steg per företag blir det runt 900 nya företag i månaden, ungefär 45 per vardag.

## Uppsättning
- [ ] Fråga chefen (meddelandet nedan) och få svar skriftligt
- [ ] Ta reda på om Driv kör Google Workspace eller Microsoft 365 (då kopplar vi rätt sak till Claude Code)
- [ ] Köp 2–3 domäner som Driv godkänt, i Drivs namn om möjligt
- [ ] Skapa 2 inkorgar per domän med ditt riktiga namn (naim@, naim.amara@)
- [ ] Sätt SPF, DKIM och DMARC på varje domän, och låt domänen peka vidare till Drivs webbplats
- [ ] Koppla inkorgarna till utskicksverktyget och starta uppvärmningen (2–3 veckor)
- [ ] Fyll i `outreach` i `system/business.json`: mode `campaign`, domäner, antal inkorgar, startdatum för uppvärmningen, verktyg
- [ ] Första kampanjen med 15–20 mejl per inkorg och dag, sedan upp till 30 om studsar och skräpanmälningar är låga
- [ ] Varje vecka: /campaign → granska → ladda upp → starta. Exportera status till `inbox/` och kör /sync-pipeline.

Tills uppvärmningen är klar: ring, och skicka högst ~30 personliga mejl om dagen från din egen
adress med /outreach-drafts.

## Meddelande till chefen (klistra in och skicka)

> Hei! Før jeg setter i gang med e-post, vil jeg sjekke noen ting med dere:
>
> 1. Kjører vi Google Workspace eller Microsoft 365, og er SPF, DKIM og DMARC satt opp på domenet?
> 2. Jeg vil automatisere kalde e-poster med et utsendelsesverktøy (Instantly eller Smartlead). For ikke å skade omdømmet til hoveddomenet vårt gjør man det fra 2–3 egne domener med to innbokser hver, som varmes opp i 2–3 uker. Er det greit, og kan Driv eie domenene? Det koster rundt 1 000 kr i måneden totalt. Betaler Driv, eller skal jeg betale selv?
> 3. Jeg sender bare til generelle firmaadresser (post@, kontakt@) etter Forbrukertilsynets veiledning, og ringer beslutningstakerne. Er det greit for dere, og er det andre regler jeg skal følge?
> 4. Skal svar og tilbud gå fra naim.amara@-adressen?
>
> Takk! Naim
