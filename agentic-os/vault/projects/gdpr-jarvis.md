# Jarvis och personuppgifter

Underlag för beslut enligt anställningsavtalet 10.2 (kund- och personuppgifter får bara
registreras i system som arbetsgivaren anvisar). Från Naim Amara till Johan, Flowtel Nordic AB.

## Vad Jarvis är

Ett program som körs lokalt på min dator: en instrumentpanel och en AI-assistent (Claude Code
från Anthropic) som läser och skriver vanliga textfiler i en mapp, "valvet". Det hjälper mig
hitta företag, skriva utkast på norska, förbereda demos och hålla pipelinen uppdaterad.

Jarvis skickar aldrig mejl, ringer aldrig och laddar inte upp något. Allt som går till en kund
skickar jag själv.

## Vilka uppgifter, och var de ligger

| Uppgift | Exempel | Var | Med GDPR-läget (standard) |
| --- | --- | --- | --- |
| Företagsuppgifter | namn, org.nr, webbplats, bransch, ort, post@-adress, växelnummer | valvet på min dator | sparas |
| Kontaktpersoner | namn, direktmejl, mobilnummer | Drivs CRM | sparas inte i Jarvis |
| Samtalsanteckningar | behov, siffror, invändningar, nästa steg | valvet (`samtal/`) | sparas, med roll i stället för namn |
| Mejlutkast | uppföljning efter ett samtal | mejlkontot jag använder i jobbet | utkast, jag skickar själv |

- Valvet ligger lokalt, inte i molnet. Instrumentpanelen nås bara från datorn själv.
- En spärr stoppar att kunddata hamnar i kodförrådet på GitHub, och förrådet hålls privat.
- En roll ("daglig leder på X AS") kan fortfarande peka ut en person, så anteckningarna hålls
  korta och sakliga.

## Vad AI-tjänsten ser

När Jarvis kör en uppgift, till exempel sammanfattar ett samtal, skickas de filer uppgiften
behöver till Anthropic, som behandlar dem och svarar. Det är en behandling hos en tredje part
(ett amerikanskt bolag). Med GDPR-läget innehåller filerna i princip bara företagsuppgifter.

Anthropic har olika villkor för privata planer och företagsplaner, bland annat om data får
användas för att träna modeller och om det finns ett personuppgiftsbiträdesavtal. De aktuella
villkoren behöver kontrolleras innan kontaktpersoner hanteras i Jarvis.

## Regler som redan är inbyggda

- Jarvis gissar aldrig e-postadresser eller nummer, utan använder bara det företaget själv
  publicerat (webbplats, brreg.no, proff.no, 1881.no, gulesider.no).
- Kalla mejl går bara till allmänna adresser (post@, kontakt@), aldrig till namngivna personer
  eller enskilda firmor (markedsføringsloven § 15, Forbrukertilsynets vägledning).
- Den som ber att slippa bli kontaktad markeras och kontaktas aldrig igen.
- Inget skickas automatiskt.

## Radering och lagring

- `npm run gdpr` visar var personuppgifter finns i valvet.
- Radering på begäran: raden i pipelinen och företagets filer i `samtal/` och `outputs/`.
- När anställningen upphör raderas eller lämnas valvet över (avtalet 9.4).
- Förslag: anteckningar om företag som inte blev kunder raderas efter 12 månader.

## Beslut

1. GDPR-läge: ☐ bara företagsuppgifter (`company-only`) ☐ även kontaktpersoner (`full`)
2. AI-tjänst: ☐ min egen Claude-plan, bara företagsuppgifter ☐ ett verktyg som Flowtel/Driv tillhandahåller
3. Mejlkonto för utkast: ______________________
4. Dator: ☐ egen dator med diskkryptering och lösenord ☐ jobbdator
5. Lagringstid för anteckningar: ______________________

Godkänt av: ______________________  Datum: ______________

När det är godkänt fyller jag i `privacy` i `system/business.json` (läge, vem och datum).
