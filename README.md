# Lagebild KI

Praxis-Session (2h): Wir bauen live einen "Jira Copilot" – von der Idee bis zum Deployment, komplett mit KI.

Eine [Reveal.js](https://revealjs.com/)-Präsentation mit fünf Modulen:

1. **Requirements** – KI schreibt die Spec
2. **Anwendung** – KI baut das Projekt in VS Code
3. **Dokumentation** – KI generiert Docs aus Code
4. **Infrastruktur** – CI/CD, Container, k3s Deployment
5. **Agent als PM** – Agent macht alles allein

## Setup

```bash
npm install
npm start
```

Die Präsentation ist dann unter `http://localhost:3000` erreichbar.

## Intro-Statistik-Slide

Die Intro-Slide "Mein AI-Footprint" liest ihre Daten aus der lokal erzeugten Datei `assets/usage-stats.json`.

- `npm start` nutzt die bereits vorhandene JSON-Datei und startet schnell.
- `npm run refresh:stats` aktualisiert die Datei nur, wenn der Cache abgelaufen ist.
- `npm run refresh:stats:force` erzwingt eine komplette Neuberechnung.
- `npm run start:fresh` berechnet die Statistik neu und startet dann den lokalen Server.

Standardverhalten der Statistik:

- Zeitraum: ab `01.01.2026` beziehungsweise allgemein ab `01.01.<aktuelles Jahr>`
- Cache-Dauer: `24` Stunden
- Quelle: lokale Logs und Editor-Metadaten fuer Claude Code, Codex, Kiro sowie leichte Zusatzspuren wie GitLab Duo oder Gemini
- Metriken: geschätzte aktive Stunden, aktive Tage, Projekte

Darstellung in der Slide:

- Grosse Karten erscheinen nur fuer Tools mit belastbaren Stundenwerten.
- Leichte Zusatzspuren ohne belastbare Stunden, aber mit Aktivitaet im Zeitraum, erscheinen nur als kleine Callouts.
- Tools ohne Aktivitaet im Zeitraum werden ausgeblendet.

Optionale Overrides:

```bash
USAGE_STATS_SINCE=2025-10-01 npm run refresh:stats:force
USAGE_STATS_CACHE_HOURS=1 npm run refresh:stats
```

## Konfiguration

Kopiere `.env.example` nach `.env` und trage deinen Jira API Token ein:

```bash
cp .env.example .env
```

## Lizenz

[MIT](LICENSE)
