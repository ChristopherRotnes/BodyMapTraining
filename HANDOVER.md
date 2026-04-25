# Muskelkart — Claude Code Handover

## Prosjektbeskrivelse
En treningslogg-app der brukeren fotograferer et håndskrevet treningsprogram fra en tavle (sporty.no-format), og appen analyserer bildet, viser hvilke muskler som er trent på en kroppsfigur, og gir anbefalinger for neste økt.

---

## Nåværende status
Proof of concept er ferdig som en **enkelt React JSX-fil** (`muskelkart.jsx`). Fungerer i Claude.ai artifact-viewer og som standalone React-komponent.

### Hva som er implementert (steg 1–3)
1. **Bildeopplasting** — drag & drop, filvelger, kamera (mobil). Forhåndsvisning via data URL (ikke `createObjectURL` — fungerer ikke i sandboxed iframe).
2. **Claude Vision-analyse** — sender bildet til `claude-sonnet-4-20250514` og får tilbake strukturert JSON med øvelser inkl. `primary` og `secondary` muscle-ID-er per øvelse.
3. **Bekreftelsessteg** — brukeren kan toggle, redigere navn, og justere sett/reps. Default sett = 1 om ikke angitt. Manuell øvelse kan legges til.
4. **Kroppskart** — SVG front+back med gul highlight for primære muskler, blå for sekundære. Glow-effekt.
5. **Mouseover-tooltip** — hover over et muskelområde viser hvilke øvelser som treffer den muskelen.
6. **Anbefalingsknapp** — kaller Claude API med liste over trente/utrente muskler, returnerer 5 øvelsesforslag med egne primary/secondary og tips. Vises med eget kroppskart + tooltip.

---

## Arkitektur og nøkkelbeslutninger

### Muskelanalyse
Opprinnelig forsøkt med lokal keyword-matching (EX_DB array). **Erstattet** fordi norske forkortelser og tavle-varianter ikke matchet pålitelig. Nå ber analyse-prompten Claude returnere muscle-ID-er direkte:
```json
{"name":"RDL","primary":["hamstrings","glutes"],"secondary":["lower_back"],"sets":"3","reps":"10"}
```
Lokal EX_DB er beholdt som fallback for manuelt lagt til øvelser.

### Muscle-ID-er (17 totalt)
```
chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves,
traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back
```
Hver ID har en `view` (front/back) og norsk `label` i `MUSCLES`-objektet.

### SVG-kropp
Forenklet geometri — polygon-silhuett + ellipser per muskelgruppe. Ikke anatomisk presis SVG, men visuelt tilstrekkelig for PoC. Koordinater er basert på `viewBox="0 0 160 360"`.

### API-kall
Bruker Anthropic `/v1/messages` direkte fra klienten (ingen backend). API-nøkkel injiseres av Claude.ai artifact-miljøet — **må byttes ut med egen nøkkel** i produksjon. Modell: `claude-sonnet-4-20250514`.

---

## Datamodell (øvelse-objekt)
```typescript
{
  id: number,
  name: string,           // Fra tavlen / brukerredigert
  standardName: string,   // Normalisert navn
  sets: string | null,    // Default "1" om ikke angitt
  reps: string | null,
  primary: string[],      // muscle-IDs fra Claude
  secondary: string[],    // muscle-IDs fra Claude
  enabled: boolean        // Toggle i bekreftelsessteget
}
```

---

## Hva som mangler (steg 4–6)

### Steg 4 — Persistering
- Supabase er allerede koblet til brukeren via Claude.ai MCP
- Trenger tabeller: `sessions`, `exercises`, `muscle_activations`
- Én session = én treningsøkt med dato + liste av øvelser

### Steg 5 — Dagsrapport
- Identisk med nåværende muskelkart-visning, men lastet fra historikk

### Steg 6 — Perioderapport
- Aggreger muscle-aktivering over valgt periode
- Vis hvilke muskelgrupper som er **undertrent** (highlight på kropp)
- Gap-analyse krever definisjon av "nok" — forslag: brukerinnstillinger eller defaults basert på treningsfrekvens

---

## Anbefalte neste steg for Claude Code
1. Sett opp Supabase-prosjekt med tabellstruktur
2. Flytt API-kall til en enkel Next.js/Edge-funksjon (skjuler API-nøkkel)
3. Legg til autentisering (Supabase Auth)
4. Bygg historikk-visning og perioderapport
5. Vurder anatomisk korrekt SVG (f.eks. fra Wikimedia commons body map-SVG-er) for mer presis muskelvisualisering

---

## Kjente begrensninger
- SVG-kroppen er geometrisk forenklet — ikke anatomisk presis
- Volum (sett × reps) logges men brukes ikke i muskelanalysen ennå
- Anbefaling er kontekstuell per økt, ikke basert på akkumulert historikk (blir bedre med data)
- Ingen feilhåndtering for API-rate-limits

---

## Fil
- `muskelkart.jsx` — komplett standalone React-komponent, ~600 linjer
