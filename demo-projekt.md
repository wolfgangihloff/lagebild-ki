# Demo-Projekt: Jira Copilot

> Ein VS Code Projekt das Jira-Daten intelligent aufbereitet – gebaut live in der Session, mit KI, direkt im Editor.

## Warum dieses Projekt?

- Jeder im Raum kennt die Jira-Hölle
- Ohne KI: Wochen Arbeit (API-Anbindung, Logik, Tests, Deployment)
- Mit KI: Live in 2h von Null auf lauffähig
- Teilnehmer sehen den Agent in VS Code arbeiten – in Echtzeit

## Features

### Kern-Features (Demo-Scope)

1. **Daten aus zwei Projekten normalisieren & zusammenführen**
   - Verschiedene Projekte, verschiedene Felder, Konventionen
   - KI erkennt Muster und schlägt Mapping vor
   - Unified View über Projektgrenzen hinweg

2. **Vorschlag fürs Daily**
   - Was hat sich seit gestern geändert?
   - Welche Tickets sind blocked?
   - Was sollte besprochen werden?

3. **Vorschlag für den nächsten Sprint**
   - Backlog-Analyse: Was ist ready, was hat Abhängigkeiten?
   - Velocity-basierte Empfehlung: Was passt rein?
   - Risiken und offene Fragen

4. **Eigene Regeln & Daten hinterlegen**
   - Konfigurierbare Regeln (z.B. "Stories ohne Akzeptanzkriterien → Warnung")
   - Team-spezifische Daten (Verfügbarkeit, Skills, Präferenzen)
   - KI wendet die Regeln an und erklärt Abweichungen

5. **Abrechnung**
   - Zeiterfassung aus Jira aggregieren
   - Auswertung pro Projekt, pro Person, pro Sprint

6. **Kapazitätenplanung**
   - Wer ist verfügbar, wer ist überlastet?
   - Urlaubsplanung, Teilzeit berücksichtigen
   - Sprint-Kapazität berechnen

## Techstack

- **TypeScript / Node.js** (Projektbasis)
- **Jira REST API** (Datenquelle)
- **LLM-Integration** (Claude/OpenAI für intelligente Vorschläge)
- **VS Code + Claude Code** (Entwicklungsumgebung = Demo-Umgebung)
- **Docker / k3s** (Deployment)

## Durchlauf durch die Module

| Modul | Was wir zeigen |
|-------|---------------|
| 1 - Requirements | KI schreibt die Spec aus dieser Feature-Liste |
| 2 - Anwendung | KI baut das Projekt in VS Code (Jira-Anbindung, Logik, Tests) |
| 3 - Doku | KI generiert README, Setup Guide, Architecture Doc |
| 4 - Infra | CI/CD Pipeline, Container, Deployment auf k3s |
| 5 - Agent als PM | Agent bekommt "Füge Kapazitätenplanung hinzu" und macht alles |
