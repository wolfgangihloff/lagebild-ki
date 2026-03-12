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

## Konfiguration

Kopiere `.env.example` nach `.env` und trage deinen Jira API Token ein:

```bash
cp .env.example .env
```

## Lizenz

[MIT](LICENSE)
