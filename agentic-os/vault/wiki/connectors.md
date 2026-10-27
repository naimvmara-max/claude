# Kopplingar (connectors)

Skills når utanför valvet via MCP-kopplingar. Körningar i bakgrunden kan inte svara på
behörighetsfrågor, så varje verktyg en skill behöver måste vara tillåtet i
`.claude/settings.json`. Tillåt bara läs- och utkastverktyg. Att skicka är alltid manuellt.

## Så lägger du till en i Claude Code

```bash
# från vault-mappen
claude mcp add --transport http <namn> <server-url>
claude mcp list          # kontrollera att den är ansluten
```

Kopplingar som redan är anslutna på claude.ai kan också dyka upp i Claude Code när du är
inloggad med samma konto. Kör `/mcp` i `claude` för att se vad som finns, och kopiera de
exakta verktygsnamnen till listan `allow`.

## Vilken skill behöver vad

| Koppling | Skills | Tillåt | Behåll manuellt |
| --- | --- | --- | --- |
| Gmail | outreach-drafts, follow-ups, sync-pipeline, inbox-brief, offer, commission-check | sök, läs, skapa utkast | skicka, vidarebefordra, radera, etiketter |
| Google Kalender | plan-today, inbox-brief, sync-pipeline, demo-prep | lista och läsa händelser, föreslå tider | skapa, ändra, radera händelser |
| Webbsök och hämtning | lead-research, call-list, demo-prep, morning-intel, deep-research (brreg.no, proff.no, FINN) | tillåtet som standard | — |

## Värt att lägga till senare
- Drivs CRM, så att affärer inte följs upp på två ställen (fråga vilket CRM ni använder).
- Ett utskicksverktyg (Instantly, Smartlead, Lemlist) om du skickar volym därifrån i stället för
  Gmail: då ska /sync-pipeline läsa skickat och svar därifrån.
- En dialer om du ringer mycket, så att samtal loggas utan att du skriver.

## Status
- Anslutet på claude.ai idag: Gmail, Google Kalender, Google Drive.
- Utan Gmail i Claude Code skriver mejl-skills utkasten i `outputs/` i stället, och du
  uppdaterar pipelinen själv i HUD:en (Kommando → Pipeline).
- brreg.no:s öppna API kräver inget konto: lead-research når det med webbhämtning.
