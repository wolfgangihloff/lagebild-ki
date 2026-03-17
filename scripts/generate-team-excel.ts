import ExcelJS from 'exceljs';
import path from 'path';
import { mkdirSync } from 'fs';

type Level = 'Junior' | 'Professional' | 'Senior' | 'Expert' | 'Principal';

interface TeamMember {
  name: string;
  rolle: string;
  level: Level;
  stunden: number;
  satz: number;
  projekt: string;
  skills: string;
}

interface Abwesenheit {
  name: string;
  typ: string;
  von: string;
  bis: string;
  tage: number;
  genehmigt: string;
  kommentar: string;
}

interface SprintData {
  sprint: string;
  von: string;
  bis: string;
  arbeitstage: number;
  kapazitaet: number;
  geplant: number | null;
  erledigt: number | null;
  velocity: number | null;
  bemerkung?: string;
}

interface HeaderStyle {
  color: string;
}

function styleHeader(sheet: ExcelJS.Worksheet, { color }: HeaderStyle): void {
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function addTeamSheet(workbook: ExcelJS.Workbook, data: TeamMember[]): void {
  const sheet = workbook.addWorksheet('Team');
  sheet.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Rolle', key: 'rolle', width: 24 },
    { header: 'Level', key: 'level', width: 14 },
    { header: 'Wochenstunden', key: 'stunden', width: 16 },
    { header: 'Stundensatz (€)', key: 'satz', width: 16 },
    { header: 'Jira-Projekt', key: 'projekt', width: 22 },
    { header: 'Skills', key: 'skills', width: 35 },
  ];
  styleHeader(sheet, { color: 'FF4472C4' });
  data.forEach(row => sheet.addRow(row));
}

function addUrlaubSheet(workbook: ExcelJS.Workbook, data: Abwesenheit[]): void {
  const sheet = workbook.addWorksheet('Urlaub & Abwesenheiten');
  sheet.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Typ', key: 'typ', width: 18 },
    { header: 'Von', key: 'von', width: 14 },
    { header: 'Bis', key: 'bis', width: 14 },
    { header: 'Tage', key: 'tage', width: 8 },
    { header: 'Genehmigt', key: 'genehmigt', width: 12 },
    { header: 'Kommentar', key: 'kommentar', width: 30 },
  ];
  styleHeader(sheet, { color: 'FF548235' });
  data.forEach(row => sheet.addRow(row));
}

function addSprintSheet(workbook: ExcelJS.Workbook, data: SprintData[], withBemerkung = false): void {
  const sheet = workbook.addWorksheet('Sprint-Kapazität');
  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'Sprint', key: 'sprint', width: 16 },
    { header: 'Von', key: 'von', width: 14 },
    { header: 'Bis', key: 'bis', width: 14 },
    { header: 'Arbeitstage', key: 'arbeitstage', width: 14 },
    { header: 'Team-Kapazität (h)', key: 'kapazitaet', width: 20 },
    { header: 'Geplant (SP)', key: 'geplant', width: 14 },
    { header: 'Erledigt (SP)', key: 'erledigt', width: 14 },
    { header: 'Velocity', key: 'velocity', width: 12 },
  ];
  if (withBemerkung) {
    columns.push({ header: 'Bemerkung', key: 'bemerkung', width: 30 });
  }
  sheet.columns = columns;
  styleHeader(sheet, { color: 'FFBF8F00' });
  data.forEach(row => sheet.addRow(row));
}

// ==================== Project 1: 8 team members ====================

async function generateProject1(): Promise<void> {
  mkdirSync('demo_project_1', { recursive: true });
  const workbook = new ExcelJS.Workbook();

  const team: TeamMember[] = [
    { name: 'Lisa Müller', rolle: 'Backend Dev', level: 'Senior', stunden: 40, satz: 95, projekt: 'BACKEND', skills: 'Java, Spring, PostgreSQL' },
    { name: 'Tom Schneider', rolle: 'Frontend Dev', level: 'Professional', stunden: 32, satz: 85, projekt: 'FRONTEND', skills: 'React, TypeScript, CSS' },
    { name: 'Anna Weber', rolle: 'Fullstack Dev', level: 'Senior', stunden: 40, satz: 90, projekt: 'BACKEND, FRONTEND', skills: 'Node.js, React, Docker' },
    { name: 'Markus Fischer', rolle: 'DevOps Engineer', level: 'Expert', stunden: 40, satz: 100, projekt: 'BACKEND', skills: 'Kubernetes, Terraform, CI/CD' },
    { name: 'Sarah Klein', rolle: 'Frontend Dev', level: 'Junior', stunden: 40, satz: 65, projekt: 'FRONTEND', skills: 'React, JavaScript' },
    { name: 'Jan Hoffmann', rolle: 'Backend Dev', level: 'Professional', stunden: 24, satz: 88, projekt: 'BACKEND', skills: 'Python, FastAPI, PostgreSQL' },
    { name: 'Nina Braun', rolle: 'QA Engineer', level: 'Professional', stunden: 30, satz: 78, projekt: 'BACKEND, FRONTEND', skills: 'Cypress, Jest, Testplanung' },
    { name: 'Kai Schmidt', rolle: 'Tech Lead', level: 'Principal', stunden: 40, satz: 110, projekt: 'BACKEND, FRONTEND', skills: 'Architektur, Java, Review' },
  ];

  const urlaub: Abwesenheit[] = [
    { name: 'Lisa Müller', typ: 'Urlaub', von: '2026-03-23', bis: '2026-04-03', tage: 10, genehmigt: 'Ja', kommentar: 'Osterurlaub' },
    { name: 'Lisa Müller', typ: 'Fortbildung', von: '2026-04-20', bis: '2026-04-21', tage: 2, genehmigt: 'Ja', kommentar: 'AWS Zertifizierung' },
    { name: 'Tom Schneider', typ: 'Urlaub', von: '2026-03-16', bis: '2026-03-20', tage: 5, genehmigt: 'Ja', kommentar: '' },
    { name: 'Anna Weber', typ: 'Krank', von: '2026-03-10', bis: '2026-03-12', tage: 3, genehmigt: '-', kommentar: 'Krankmeldung liegt vor' },
    { name: 'Anna Weber', typ: 'Urlaub', von: '2026-04-06', bis: '2026-04-17', tage: 10, genehmigt: 'Ja', kommentar: '' },
    { name: 'Markus Fischer', typ: 'Urlaub', von: '2026-04-13', bis: '2026-04-17', tage: 5, genehmigt: 'Ja', kommentar: '' },
    { name: 'Sarah Klein', typ: 'Fortbildung', von: '2026-03-25', bis: '2026-03-27', tage: 3, genehmigt: 'Beantragt', kommentar: 'React Conf Berlin' },
    { name: 'Jan Hoffmann', typ: 'Elternzeit', von: '2026-05-01', bis: '2026-06-30', tage: 43, genehmigt: 'Ja', kommentar: '2 Monate Elternzeit' },
    { name: 'Nina Braun', typ: 'Urlaub', von: '2026-03-30', bis: '2026-04-03', tage: 5, genehmigt: 'Ja', kommentar: 'Osterferien Kinder' },
    { name: 'Kai Schmidt', typ: 'Konferenz', von: '2026-04-08', bis: '2026-04-10', tage: 3, genehmigt: 'Ja', kommentar: 'WeAreDevelopers Berlin' },
  ];

  const sprints: SprintData[] = [
    { sprint: 'Sprint 2026-05', von: '2026-02-03', bis: '2026-02-14', arbeitstage: 10, kapazitaet: 280, geplant: 42, erledigt: 38, velocity: 38 },
    { sprint: 'Sprint 2026-06', von: '2026-02-17', bis: '2026-02-28', arbeitstage: 10, kapazitaet: 264, geplant: 40, erledigt: 41, velocity: 41 },
    { sprint: 'Sprint 2026-07', von: '2026-03-02', bis: '2026-03-13', arbeitstage: 10, kapazitaet: 232, geplant: 38, erledigt: 35, velocity: 35 },
    { sprint: 'Sprint 2026-08', von: '2026-03-16', bis: '2026-03-27', arbeitstage: 10, kapazitaet: 208, geplant: 34, erledigt: null, velocity: null },
    { sprint: 'Sprint 2026-09', von: '2026-03-30', bis: '2026-04-10', arbeitstage: 9, kapazitaet: 180, geplant: null, erledigt: null, velocity: null },
    { sprint: 'Sprint 2026-10', von: '2026-04-13', bis: '2026-04-24', arbeitstage: 10, kapazitaet: 168, geplant: null, erledigt: null, velocity: null },
  ];

  addTeamSheet(workbook, team);
  addUrlaubSheet(workbook, urlaub);
  addSprintSheet(workbook, sprints);

  const outputPath = path.resolve('demo_project_1/team-kapazitaet.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Created: ${outputPath}`);
}

// ==================== Project 2: 12 team members ====================

async function generateProject2(): Promise<void> {
  mkdirSync('demo_project_2', { recursive: true });
  const workbook = new ExcelJS.Workbook();

  const team: TeamMember[] = [
    { name: 'Petra Hartmann', rolle: 'Tech Lead', level: 'Principal', stunden: 40, satz: 115, projekt: 'PLATFORM, MOBILE', skills: 'Architektur, Java, Kotlin, Review' },
    { name: 'Stefan Reiter', rolle: 'Backend Dev', level: 'Senior', stunden: 40, satz: 98, projekt: 'PLATFORM', skills: 'Java, Spring Boot, Kafka, PostgreSQL' },
    { name: 'Miriam Yilmaz', rolle: 'Backend Dev', level: 'Professional', stunden: 32, satz: 88, projekt: 'PLATFORM', skills: 'Go, gRPC, Redis' },
    { name: 'Felix Lange', rolle: 'Frontend Dev', level: 'Principal', stunden: 40, satz: 110, projekt: 'MOBILE', skills: 'React Native, TypeScript, Swift' },
    { name: 'Claudia Berger', rolle: 'Frontend Dev', level: 'Professional', stunden: 40, satz: 82, projekt: 'MOBILE', skills: 'React Native, JavaScript, Figma' },
    { name: 'Tobias Engel', rolle: 'Fullstack Dev', level: 'Senior', stunden: 40, satz: 90, projekt: 'PLATFORM, MOBILE', skills: 'Node.js, React, Docker, PostgreSQL' },
    { name: 'Anja Krüger', rolle: 'DevOps Engineer', level: 'Expert', stunden: 40, satz: 105, projekt: 'PLATFORM, MOBILE', skills: 'Kubernetes, Terraform, AWS, GitLab CI' },
    { name: 'Dennis Wolf', rolle: 'SRE / Ops', level: 'Expert', stunden: 40, satz: 100, projekt: 'PLATFORM', skills: 'Monitoring, Grafana, Incident Response, Linux' },
    { name: 'Lena Schuster', rolle: 'QA Lead', level: 'Senior', stunden: 40, satz: 88, projekt: 'PLATFORM, MOBILE', skills: 'Testplanung, Cypress, Appium, Teststrategie' },
    { name: 'Patrick Vogel', rolle: 'QA Engineer', level: 'Professional', stunden: 40, satz: 72, projekt: 'PLATFORM', skills: 'API-Tests, Postman, k6, Jest' },
    { name: 'Simone Kraft', rolle: 'QA Engineer', level: 'Professional', stunden: 30, satz: 70, projekt: 'MOBILE', skills: 'Mobile Testing, Appium, BrowserStack' },
    { name: 'Moritz Hahn', rolle: 'Backend Dev', level: 'Junior', stunden: 40, satz: 62, projekt: 'PLATFORM', skills: 'Java, Spring Boot (in Einarbeitung)' },
  ];

  const urlaub: Abwesenheit[] = [
    { name: 'Petra Hartmann', typ: 'Konferenz', von: '2026-03-18', bis: '2026-03-20', tage: 3, genehmigt: 'Ja', kommentar: 'KubeCon EU' },
    { name: 'Petra Hartmann', typ: 'Urlaub', von: '2026-04-06', bis: '2026-04-10', tage: 5, genehmigt: 'Ja', kommentar: '' },
    { name: 'Stefan Reiter', typ: 'Krank', von: '2026-03-09', bis: '2026-03-13', tage: 5, genehmigt: '-', kommentar: 'Rücken-OP Nachsorge' },
    { name: 'Stefan Reiter', typ: 'Urlaub', von: '2026-04-13', bis: '2026-04-24', tage: 10, genehmigt: 'Ja', kommentar: 'Familienurlaub' },
    { name: 'Miriam Yilmaz', typ: 'Urlaub', von: '2026-03-23', bis: '2026-04-03', tage: 10, genehmigt: 'Ja', kommentar: 'Osterurlaub Türkei' },
    { name: 'Felix Lange', typ: 'Fortbildung', von: '2026-03-16', bis: '2026-03-17', tage: 2, genehmigt: 'Ja', kommentar: 'React Native Advanced Workshop' },
    { name: 'Felix Lange', typ: 'Urlaub', von: '2026-05-11', bis: '2026-05-22', tage: 10, genehmigt: 'Beantragt', kommentar: '' },
    { name: 'Claudia Berger', typ: 'Mutterschutz', von: '2026-05-01', bis: '2026-08-31', tage: 88, genehmigt: 'Ja', kommentar: 'Mutterschutz + Elternzeit' },
    { name: 'Tobias Engel', typ: 'Urlaub', von: '2026-03-30', bis: '2026-04-03', tage: 5, genehmigt: 'Ja', kommentar: 'Osterferien' },
    { name: 'Anja Krüger', typ: 'Urlaub', von: '2026-04-20', bis: '2026-05-01', tage: 10, genehmigt: 'Ja', kommentar: '' },
    { name: 'Anja Krüger', typ: 'Konferenz', von: '2026-03-18', bis: '2026-03-20', tage: 3, genehmigt: 'Ja', kommentar: 'KubeCon EU (mit Petra)' },
    { name: 'Dennis Wolf', typ: 'Bereitschaft', von: '2026-03-16', bis: '2026-03-27', tage: 10, genehmigt: '-', kommentar: 'On-Call Rotation, 50% Kapazität' },
    { name: 'Dennis Wolf', typ: 'Urlaub', von: '2026-04-06', bis: '2026-04-10', tage: 5, genehmigt: 'Ja', kommentar: '' },
    { name: 'Lena Schuster', typ: 'Fortbildung', von: '2026-04-01', bis: '2026-04-02', tage: 2, genehmigt: 'Ja', kommentar: 'ISTQB Advanced' },
    { name: 'Patrick Vogel', typ: 'Urlaub', von: '2026-03-23', bis: '2026-03-27', tage: 5, genehmigt: 'Ja', kommentar: '' },
    { name: 'Simone Kraft', typ: 'Kind krank', von: '2026-03-11', bis: '2026-03-13', tage: 3, genehmigt: '-', kommentar: '' },
    { name: 'Simone Kraft', typ: 'Urlaub', von: '2026-04-06', bis: '2026-04-17', tage: 10, genehmigt: 'Ja', kommentar: 'Osterferien Kinder' },
    { name: 'Moritz Hahn', typ: 'Fortbildung', von: '2026-03-25', bis: '2026-03-27', tage: 3, genehmigt: 'Beantragt', kommentar: 'Java Spring Bootcamp intern' },
  ];

  const sprints: SprintData[] = [
    { sprint: 'Sprint 2026-05', von: '2026-02-03', bis: '2026-02-14', arbeitstage: 10, kapazitaet: 420, geplant: 58, erledigt: 52, velocity: 52, bemerkung: '' },
    { sprint: 'Sprint 2026-06', von: '2026-02-17', bis: '2026-02-28', arbeitstage: 10, kapazitaet: 420, geplant: 55, erledigt: 56, velocity: 56, bemerkung: '' },
    { sprint: 'Sprint 2026-07', von: '2026-03-02', bis: '2026-03-13', arbeitstage: 10, kapazitaet: 356, geplant: 50, erledigt: 44, velocity: 44, bemerkung: 'Stefan krank, Simone Kind krank' },
    { sprint: 'Sprint 2026-08', von: '2026-03-16', bis: '2026-03-27', arbeitstage: 10, kapazitaet: 296, geplant: 42, erledigt: null, velocity: null, bemerkung: 'KubeCon, On-Call Dennis, Miriam+Patrick Urlaub' },
    { sprint: 'Sprint 2026-09', von: '2026-03-30', bis: '2026-04-10', arbeitstage: 9, kapazitaet: 252, geplant: null, erledigt: null, velocity: null, bemerkung: 'Ostern, viele Abwesenheiten' },
    { sprint: 'Sprint 2026-10', von: '2026-04-13', bis: '2026-04-24', arbeitstage: 10, kapazitaet: 264, geplant: null, erledigt: null, velocity: null, bemerkung: 'Stefan+Anja Urlaub' },
    { sprint: 'Sprint 2026-11', von: '2026-04-27', bis: '2026-05-08', arbeitstage: 9, kapazitaet: 228, geplant: null, erledigt: null, velocity: null, bemerkung: '1. Mai, Claudia geht in Mutterschutz' },
  ];

  addTeamSheet(workbook, team);
  addUrlaubSheet(workbook, urlaub);
  addSprintSheet(workbook, sprints, true);

  const outputPath = path.resolve('demo_project_2/team-kapazitaet.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Created: ${outputPath}`);
}

// ==================== Run ====================

async function main(): Promise<void> {
  await Promise.all([generateProject1(), generateProject2()]);
}

main();
