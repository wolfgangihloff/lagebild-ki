const fs = require("fs");
const os = require("os");
const path = require("path");

const HOME = os.homedir();
const WORKSPACE_ROOT = path.join(HOME, "workspace");
const OUTPUT_PATH = path.join(process.cwd(), "assets", "usage-stats.json");
const DEFAULT_CACHE_HOURS = 24;
const DEFAULT_SINCE_DATE = `${new Date().getFullYear()}-01-01`;

function walkFiles(rootDir, extension, out = []) {
  if (!fs.existsSync(rootDir)) {
    return out;
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, extension, out);
    } else if (!extension || fullPath.endsWith(extension)) {
      out.push(fullPath);
    }
  }

  return out;
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateStart(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
}

function formatDateKey(timestampMs) {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function normalizeProjectPath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return null;
  }

  const withoutFilePrefix = rawPath.replace(/^file:\/\//, "");
  const workspacePrefix = WORKSPACE_ROOT + path.sep;

  if (withoutFilePrefix.startsWith(workspacePrefix)) {
    const segments = withoutFilePrefix
      .slice(workspacePrefix.length)
      .split(path.sep)
      .filter(Boolean);

    if (segments.length > 0) {
      return path.join(WORKSPACE_ROOT, segments[0]);
    }
  }

  return withoutFilePrefix;
}

function estimateActiveHours(timestamps, maxGapMinutes = 15) {
  if (timestamps.length < 2) {
    return 0;
  }

  const maxGapMs = maxGapMinutes * 60 * 1000;
  const sorted = [...timestamps].sort((a, b) => a - b);
  let totalMs = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const gap = sorted[index] - sorted[index - 1];
    if (gap > 0) {
      totalMs += Math.min(gap, maxGapMs);
    }
  }

  return totalMs / 3_600_000;
}

function roundHours(value) {
  return Math.round(value * 10) / 10;
}

function isFreshCache(filePath, maxAgeHours) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const stats = fs.statSync(filePath);
  const maxAgeMs = maxAgeHours * 3_600_000;
  return Date.now() - stats.mtimeMs <= maxAgeMs;
}

function minTimestamp(current, candidate) {
  if (!Number.isFinite(candidate)) {
    return current;
  }
  if (!Number.isFinite(current)) {
    return candidate;
  }
  return Math.min(current, candidate);
}

function collectCodexStats() {
  const sinceBoundary = parseDateStart(process.env.USAGE_STATS_SINCE || DEFAULT_SINCE_DATE);
  const files = walkFiles(path.join(HOME, ".codex", "sessions"), ".jsonl");
  const projectSet = new Set();
  const daySet = new Set();
  let hours = 0;
  let since = null;

  for (const filePath of files) {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
    const sessionTimestamps = [];
    let cwd = null;

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        const timestamp = parseTimestamp(event.timestamp || event.payload?.timestamp);

        if (timestamp && (!sinceBoundary || timestamp >= sinceBoundary)) {
          sessionTimestamps.push(timestamp);
          daySet.add(formatDateKey(timestamp));
          since = minTimestamp(since, timestamp);
        }

        if (!cwd) {
          cwd = event.payload?.cwd || event.cwd || null;
        }

        if (!cwd && event.type === "turn_context") {
          cwd = event.payload?.cwd || null;
        }
      } catch {
        // Ignore malformed lines from local history.
      }
    }

    if (sessionTimestamps.length > 0) {
      hours += estimateActiveHours(sessionTimestamps);
      const project = normalizeProjectPath(cwd);
      if (project) {
        projectSet.add(project);
      }
    }
  }

  return {
    id: "codex",
    name: "Codex",
    hours: roundHours(hours),
    activeDays: daySet.size,
    projects: projectSet.size,
    since: since ? formatDateKey(since) : null,
    projectSet,
    daySet,
  };
}

function collectClaudeStats() {
  const sinceBoundary = parseDateStart(process.env.USAGE_STATS_SINCE || DEFAULT_SINCE_DATE);
  const files = walkFiles(path.join(HOME, ".claude", "projects"), ".jsonl");
  const projectSet = new Set();
  const daySet = new Set();
  let hours = 0;
  let since = null;

  for (const filePath of files) {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
    const sessionTimestamps = [];
    const sessionDays = new Set();
    let sessionSince = null;
    let cwd = null;
    let hasExternalUserMessage = false;

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        const timestamp = parseTimestamp(event.timestamp || event.createdAt || event.updatedAt);

        if (timestamp && (!sinceBoundary || timestamp >= sinceBoundary)) {
          sessionTimestamps.push(timestamp);
          sessionDays.add(formatDateKey(timestamp));
          sessionSince = minTimestamp(sessionSince, timestamp);
        }

        if (!cwd) {
          cwd = event.cwd || event.message?.cwd || null;
        }

        if (event.userType === "external" && event.type === "user") {
          hasExternalUserMessage = true;
        }
      } catch {
        // Ignore malformed lines from local history.
      }
    }

    if (!hasExternalUserMessage || sessionTimestamps.length === 0) {
      continue;
    }

    hours += estimateActiveHours(sessionTimestamps);
    since = minTimestamp(since, sessionSince);

    for (const day of sessionDays) {
      daySet.add(day);
    }

    const project = normalizeProjectPath(cwd);
    if (project) {
      projectSet.add(project);
    }
  }

  return {
    id: "claude",
    name: "Claude Code",
    hours: roundHours(hours),
    activeDays: daySet.size,
    projects: projectSet.size,
    since: since ? formatDateKey(since) : null,
    projectSet,
    daySet,
  };
}

function collectKiroStats() {
  const sinceBoundary = parseDateStart(process.env.USAGE_STATS_SINCE || DEFAULT_SINCE_DATE);
  const files = walkFiles(
    path.join(HOME, "Library", "Application Support", "Kiro", "User", "globalStorage", "kiro.kiroagent"),
    ".chat"
  );

  const executions = new Map();
  let since = null;

  for (const filePath of files) {
    try {
      const chat = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const executionId = chat.executionId || path.basename(filePath);
      const startTime = Number(chat.metadata?.startTime || chat.startTime);
      const endTime = Number(chat.metadata?.endTime || chat.endTime);
      const current = executions.get(executionId) || { start: null, end: null };

      if (Number.isFinite(startTime) && (!sinceBoundary || startTime >= sinceBoundary || (Number.isFinite(endTime) && endTime >= sinceBoundary))) {
        current.start = Number.isFinite(current.start) ? Math.min(current.start, startTime) : startTime;
        since = minTimestamp(since, startTime);
      }

      if (Number.isFinite(endTime) && (!sinceBoundary || endTime >= sinceBoundary)) {
        current.end = Number.isFinite(current.end) ? Math.max(current.end, endTime) : endTime;
      }

      executions.set(executionId, current);
    } catch {
      // Ignore malformed local files.
    }
  }

  let hours = 0;
  const daySet = new Set();

  for (const { start, end } of executions.values()) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      continue;
    }

    const boundedStart = Number.isFinite(sinceBoundary) ? Math.max(start, sinceBoundary) : start;

    if (boundedStart <= end) {
      daySet.add(formatDateKey(boundedStart));
      hours += (end - boundedStart) / 3_600_000;
    }
  }

  const projectSet = new Set();
  if (daySet.size > 0) {
    const workspaceFiles = walkFiles(
      path.join(HOME, "Library", "Application Support", "Kiro", "User", "workspaceStorage"),
      "workspace.json"
    );

    for (const filePath of workspaceFiles) {
      try {
        const workspace = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const project = normalizeProjectPath(workspace.folder || workspace.workspace?.folder || workspace.folderUri);
        if (project) {
          projectSet.add(project);
        }
      } catch {
        // Ignore malformed local files.
      }
    }
  }

  return {
    id: "kiro",
    name: "Kiro",
    hours: roundHours(hours),
    activeDays: daySet.size,
    projects: projectSet.size,
    since: since ? formatDateKey(since) : null,
    projectSet,
    daySet,
  };
}

function unionCount(sets) {
  const union = new Set();
  for (const values of sets) {
    for (const value of values) {
      union.add(value);
    }
  }
  return union.size;
}

function buildOutput() {
  const sinceDate = process.env.USAGE_STATS_SINCE || DEFAULT_SINCE_DATE;
  const tools = [collectClaudeStats(), collectKiroStats(), collectCodexStats()];
  const summary = {
    hours: roundHours(tools.reduce((sum, tool) => sum + tool.hours, 0)),
    activeDays: unionCount(tools.map((tool) => tool.daySet)),
    projects: unionCount(tools.map((tool) => tool.projectSet)),
    since: sinceDate,
  };

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    summary,
    tools: tools.map(({ projectSet, daySet, ...tool }) => tool),
    note: `Seit ${sinceDate} aus lokalen Session-Logs. Projekte als eindeutige Top-Level-Workspaces unter ~/workspace.`,
  };
}

function main() {
  const forceRefresh = process.argv.includes("--force");
  const cacheHours = Number(process.env.USAGE_STATS_CACHE_HOURS || DEFAULT_CACHE_HOURS);

  if (!forceRefresh && Number.isFinite(cacheHours) && isFreshCache(OUTPUT_PATH, cacheHours)) {
    console.log(`Using cached ${OUTPUT_PATH}`);
    return;
  }

  const output = buildOutput();
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main();
