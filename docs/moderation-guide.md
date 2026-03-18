# Moderations-Guide: Deep Dive agentische Softwareentwicklung


## Vor der Session

### Demo-Vorbereitung
- Frisches Git-Repo anlegen, alle Referenz-Dateien drin (agents.md, CLAUDE.md, Projekt-Skelett)
- Teams/Chat-Zugang vorab testen (in Session 1 konnten Dateien nicht in Teams hochgeladen werden)
- Separaten Ordner fuer Demo verwenden, isoliert von anderen Projekten
- Hetzner-Account / Cloud-Zugaenge vorab pruefen
- API-Keys vorbereiten (Claude, Codex) und Quota-Stand pruefen

### Zielgruppe einschaetzen
- Vorstellungsrunde mit klarem Template: "Name, Rolle, ein Satz zu KI-Erfahrung"
- Danach kalibrieren: Wie technisch kann ich erklaeren?
- Session 1 hatte von Late Adopter bis erfahrenem AI-Nutzer alles dabei
- Faustregel: Im Zweifel einfacher erklaeren, technische Teilnehmer fragen von selbst tiefer

## Waehrend der Session

### Fragen-Management (Parking Lot)
**Problem:** In Session 1 ging eine Hardware-Frage verloren. Eine Frage zu Claude/Codex-Wechsel wurde aufgeschoben und vergessen.

**Loesung:**
- Sticky Note / Notizzettel sichtbar auf dem Bildschirm
- Offene Fragen notieren
- Am Ende jedes Moduls kurz durchgehen: "Wir hatten noch offene Fragen..."

### Erwartungsmanagement
**Frueh kommunizieren:**
> "Am Ende haben wir einen funktionierenden Prototyp. Nicht produktionsreif - aber der Beweis, dass es funktioniert. Production braucht Tests, Security Review, Monitoring."

Das senkt die Fallhoehe bei Bugs und erhoecht die Wertschaetzung fuer das Ergebnis.

### Bug-Handling in der Demo
Wenn ein Bug live auftritt:
1. **Kurz zeigen:** "Seht ihr - das passiert"
2. **Erklaeren:** "Das ist genau der Punkt wo wir als Supervisor eingreifen"
3. **Optional:** Agent beauftragen den Bug zu fixen (zeigt den Workflow)
4. **Wenn es zu lange dauert:** "Das nehme ich mit, lasst uns weitergehen"

Nicht: Bug 5x reproduzieren ohne Analyse (passiert bei Login-Bug in Session 1).

### Parallele Agents erklaeren
**Metapher die funktioniert:**
> "Stellt euch vor, ihr habt zwei Praktikanten. Einer baut das Backend, einer die Doku. Die reden nicht miteinander, aber ihr koordiniert beide."

Dann live zeigen statt weiter erklaeren.

### Technische Begriffe
- Begriffe beim ersten Mal kurz erklaeren (IDE, Monorepo, Walking Skeleton)
- Oder auf die Glossar-Slide verweisen (slides/08-followup.html)
- In Session 1 fragte ein Teilnehmer was "IDE" ist - bei nicht-technischem Publikum Standard

### Pace-Management
- **Deep-Dive-Format:** 3-4h einplanen, als "halber Tag" kommunizieren
- **2h-Format:** Weniger Interaktion, strengeres Time-Boxing, nur 2-3 Module
- Timer-Overlay konsequent nutzen
- Bei Ueberziehung ansagen: "Wir sind 5 Min drueber - straffen wir oder nehmen wir uns die Zeit?"
- Realitaet Session 1: Vorstellungsrunde + Projekt-Auswahl = 24 Min statt 10 Min

## Was beibehalten (funktioniert!)

### Staerken
- **Gleichzeitig entwickeln + praesentieren** - das beeindruckt am meisten
- **Audience-Input sofort live einbauen** - z.B. Ticket-Pricing-Idee eines Teilnehmers direkt umgesetzt
- **Kosten offen nennen** - $200/mo direkt sagen statt vage bleiben
- **Ehrliche Limitationen** - "das ist Boilerplate", "der Agent hat von meinen anderen Projekten abgeschaut"
- **Casino/Endorphin-Metapher** - relatable und ehrlich
- **"Make it so" (Picard)** - Agent schlaegt vor, du bestaetigst nur

### Audience-Engagement
- Teilnehmer ihre Use Cases einbringen lassen (Checklisten, Ticket-Wellen, etc.)
- Expertise der Teilnehmer nutzen (z.B. Agent-Rules im Chat teilen lassen)
- Projekt-Ideen als Backup haben, aber zuerst die Gruppe fragen

## Feedback aus Session 1 (17.03.2026, ~10 Teilnehmer)

### Was gut ankam
- Praktische Einfuehrung: Umsetzung eines Testprojekts
- Praesentation waehrend der Entwicklung ("krass interessant")
- Man kann Schritte durch die Live-Vorfuehrung nachvollziehen
- Klare, verstaendliche, deutliche Kommunikation
- Material wird nach dem Vortrag zur Verfuegung gestellt
- "Insgesamt ein sehr motivierender Vortrag AI fuer Softwareentwicklung zu nutzen"

### Verbesserungswunsch
- "In der Praesentation: Eine Art Guide mit den wesentlichen Schritten im Entwicklungsprozess."
  → Umgesetzt als Slide "AI-Entwicklungsprozess" in slides/08-followup.html

## Zeitreferenz: Session 1 (17.03.2026)

| Phase | Geplant | Tatsaechlich |
|-------|---------|-------------|
| Intro + Vorstellungsrunde | 10 min | 24 min |
| Requirements | 20 min | 14 min |
| Anwendung | 25 min | 46 min |
| Pause | 5 min | verteilt |
| Dokumentation | 20 min | 24 min |
| Infrastruktur | 20 min | 51 min |
| Agent als PM | 15 min | (in Anwendung integriert) |
| Q&A | 5 min | 12 min |
| **Gesamt** | **120 min** | **~171 min aktiv** |
