# Activity Log

| # | User Input | Claude Code Actions |
|---|-----------|-------------------|
| 1 | *Opened `README.md` in IDE* | — |
| 2 | "an welchen projekten sollten team 1 und 2 die nächsten 2 Wochen arbeiten?" | Read `README.md`, globbed all project files |
| 3 | "epics meine ich" | Read `demo-projekt.md`, `agenda.md`, `module/05-agent-projektmanager.md`, `index.html` — concluded: no team/epic data in repo. Asked user for clarification (demo data, real Jira, or other context?) |
| 4 | "maybe use a jira cli?" | Checked if Jira CLI is installed locally (`which jira`, `brew list`, `npm list`, `pip3 list`). Found `jira-cli` available via Homebrew. Web-searched for `ankitpokhrel/jira-cli`. Suggested installing it and asked for Jira Server URL + Projekt-Keys. |
| 5 | "can you summarize in an activity log..." | Generated activity log table |
| 6 | "can you write that to an activity_log.md and make sure to continuously add to it?" | Created `activity_log.md` |
| 7 | "was sollte gemacht werden bevor wir das nach github hochschieben, gitignore und .env example? license MIT" | Explored project structure. Created `.gitignore` (ignores `node_modules/`, `.env`, `.claude/`, `dist/`, `.DS_Store`). Created `.env.example` (template without real secrets). Created `LICENSE` (MIT, Copyright 2026 Wolfgang Ihloff). Created `README.md` (Projektbeschreibung, Setup, Lizenz). Updated `package.json` license from ISC → MIT. Ran `git init`, verified `.env` and `node_modules/` correctly ignored. |
| 8 | "can you extract from claude local history all the interactions so far for this project and put them into llm_log/" | Parsed 5 JSONL session files from `~/.claude/projects/`. Wrote readable markdown logs to `llm_log/session_01.md` through `session_05.md`. Created `_convert.py` script for re-runs. |
