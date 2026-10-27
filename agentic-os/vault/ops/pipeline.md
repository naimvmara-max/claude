# Pipeline

Varje företag är en rad. Dashboarden räknar allt från den här tabellen: kontakter, svar,
bokade möten, demos, offerter, vunna affärer och provision. Ändra här, i HUD:en
(Kommando → Pipeline), eller låt skills uppdatera den.

- **status** (id:n står på engelska eftersom skills skriver dem):
  researched (hittad) → drafted (utkast) → contacted (kontaktad) → replied (har svarat) →
  booked (möte bokat) → demo (demo hållen) → offer (offert skickad) → won (vunnen) eller lost (förlorad)
- **channel**: hur första kontakten skedde: `email`, `phone`, `linkedin` eller `other`.
  Tomt räknas som mejl. Svarsfrekvensen räknar bara mejl.
- **booked_via**: hur mötet bokades: `email` (de svarade på ett mejl) eller `phone` (ett samtal).
  HUD:en sätter det när du väljer "Möte bokat · via mejl" eller "· via samtal". Det avgör
  kanalsiffrorna: ett företag som mejlades först men bokades i telefon räknas som "samtal efter mejl".
- **package**: `S`, `M` eller `L` (Small, Medium, Large). På en vunnen rad avgör den provisionen
  (5 000, 10 000, 20 000 kr, se `system/business.json`). Lämna tomt tills du vet.
- **datum** skrivs `ÅÅÅÅ-MM-DD`: `contacted` första mejlet eller samtalet, `booked` dagen mötet
  bokades, `demo` dagen den hölls, `offer` dagen offerten skickades, `closed` dagen den vanns eller
  förlorades, `paid` dagen provisionen betalades ut (med lönen månaden efter signering).
- **next_date / next_action**: när och vad som är nästa steg. Företaget dyker upp under
  "Uppföljningar" det datumet. För ett bokat möte: skriv mötesdatumet i `next_date`.

| id | company | contact | email | phone | website | industry | city | channel | package | status | added | contacted | replied | booked | booked_via | demo | offer | closed | paid | next_date | next_action | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
