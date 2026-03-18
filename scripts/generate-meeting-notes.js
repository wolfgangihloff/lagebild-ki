/**
 * generate-meeting-notes.js
 *
 * Transforms a raw Microsoft Teams meeting recording (.docx transcript)
 * into a polished, shareable PDF with screenshots.
 *
 * Pipeline:
 *   1. Extract raw text from .docx (via textutil on macOS)
 *   2. Send transcript to an LLM (Claude) to produce a condensed
 *      two-role Gesprächsverlauf as structured JSON
 *   3. Render JSON into a styled HTML document (with screenshot refs)
 *   4. Convert HTML → PDF via weasyprint
 *
 * Usage:
 *   node scripts/generate-meeting-notes.js <input.docx> [options]
 *
 * Options:
 *   --presenter <name>     Name of the presenter (default: "Wolfgang Ihloff")
 *   --audience  <name>     Label for all other speakers (default: "Audience")
 *   --screenshots <dir>    Directory with numbered screenshots (default: none)
 *   --output-dir <dir>     Where to write output files (default: same dir as input)
 *   --lang <de|en>         Output language (default: "de")
 *   --skip-pdf             Only generate HTML, skip PDF conversion
 *   --skip-llm             Skip LLM step, expect <input>.sections.json to exist
 *   --help                 Show this help
 *
 * Prerequisites:
 *   - macOS (uses `textutil` for .docx → .txt)
 *   - Python 3 with `weasyprint` installed (for PDF generation)
 *   - Claude CLI (`claude`) on PATH, or set ANTHROPIC_API_KEY for API usage
 *
 * Example:
 *   node scripts/generate-meeting-notes.js \
 *     "tmp/Deep Dive und Demo agentische Softwareentwicklung.docx" \
 *     --presenter "Wolfgang Ihloff" \
 *     --screenshots docs/screenshots \
 *     --output-dir docs
 */

const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");

// ─── Argument parsing ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    input: null,
    presenter: "Wolfgang Ihloff",
    audience: "Audience",
    screenshots: null,
    outputDir: null,
    lang: "de",
    skipPdf: false,
    skipLlm: false,
  };

  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--presenter":
        args.presenter = argv[++i];
        break;
      case "--audience":
        args.audience = argv[++i];
        break;
      case "--screenshots":
        args.screenshots = argv[++i];
        break;
      case "--output-dir":
        args.outputDir = argv[++i];
        break;
      case "--lang":
        args.lang = argv[++i];
        break;
      case "--skip-pdf":
        args.skipPdf = true;
        break;
      case "--skip-llm":
        args.skipLlm = true;
        break;
      case "--help":
        console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1]);
        process.exit(0);
        break;
      default:
        positional.push(argv[i]);
    }
  }

  args.input = positional[0];
  if (!args.input) {
    console.error("Error: No input .docx file specified. Use --help for usage.");
    process.exit(1);
  }
  if (!fs.existsSync(args.input)) {
    console.error(`Error: File not found: ${args.input}`);
    process.exit(1);
  }
  if (!args.outputDir) {
    args.outputDir = path.dirname(args.input);
  }

  return args;
}

// ─── Step 1: Extract text from .docx ─────────────────────────────────────────

function extractText(docxPath) {
  console.log(`[1/4] Extracting text from ${path.basename(docxPath)} ...`);

  // macOS textutil is fast and reliable for .docx → .txt
  try {
    const text = execFileSync("textutil", ["-convert", "txt", "-stdout", docxPath], {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    console.log(`      → ${text.split("\n").length} lines extracted`);
    return text;
  } catch (err) {
    // Fallback: try python-docx
    console.log("      textutil failed, trying python-docx ...");
    const pyScript = `
import sys
from docx import Document
doc = Document(sys.argv[1])
for p in doc.paragraphs:
    print(p.text)
`;
    const text = execFileSync("python3", ["-c", pyScript, docxPath], {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    console.log(`      → ${text.split("\n").length} lines extracted (python-docx)`);
    return text;
  }
}

// ─── Step 2: Condense transcript via LLM ─────────────────────────────────────

function buildPrompt(transcript, presenter, audience, lang, screenshotNames) {
  const screenshotHint = screenshotNames.length > 0
    ? `\nAvailable screenshots (in order): ${screenshotNames.join(", ")}\nAssign each screenshot to the most fitting section by filename.`
    : "\nNo screenshots available — leave the screenshot field as null.";

  return `You are a professional editor. You will receive a raw Microsoft Teams meeting transcript (auto-generated, messy, with filler words and recognition errors).

Your task: Create a condensed, well-structured "Gesprächsverlauf" (conversation summary) with exactly TWO roles:
- "${presenter}" (the presenter)
- "${audience}" (everyone else combined)

Language: ${lang === "de" ? "German" : "English"}
${screenshotHint}

Output ONLY valid JSON matching this schema — no markdown fences, no commentary:

{
  "title": "string — document title",
  "date": "string — date from transcript",
  "duration": "string — approximate duration",
  "presenter": "${presenter}",
  "audience_label": "${audience}",
  "audience_description": "string — who the audience is",
  "sections": [
    {
      "number": 1,
      "title": "string — section title",
      "timeRange": "string — e.g. '0:00 - 10:00'",
      "screenshot": "string|null — filename from the list above, or null",
      "screenshotCaption": "string|null — short caption for the screenshot",
      "entries": [
        {
          "speaker": "${presenter}" | "${audience}",
          "type": "dialog" | "callout" | "best-practice",
          "text": "string — condensed, cleaned-up content. Multiple paragraphs separated by \\n\\n"
        }
      ]
    }
  ],
  "summary": [
    "string — key takeaway, as '**Bold lead.** Explanation.'"
  ]
}

Rules:
- Remove filler words, repetitions, and recognition artifacts
- Merge all non-presenter speakers into "${audience}"
- Keep only substantive exchanges — skip smalltalk, greetings, tech issues
- Use "callout" type for key insights the presenter emphasizes
- Use "best-practice" type for actionable tips/recommendations
- Aim for 8-12 sections, 4-8 entries per section
- Summary should have 5-7 bullet points
- All text in ${lang === "de" ? "German" : "English"}

TRANSCRIPT:
${transcript}`;
}

function condenseLlm(transcript, args, screenshotNames) {
  console.log("[2/4] Condensing transcript via LLM ...");

  const prompt = buildPrompt(
    transcript,
    args.presenter,
    args.audience,
    args.lang,
    screenshotNames
  );

  // Write prompt to temp file (too large for argv)
  const promptPath = path.join(args.outputDir, ".llm-prompt.tmp");
  fs.writeFileSync(promptPath, prompt);

  let jsonStr;
  try {
    // Try Claude CLI first (uses existing auth)
    jsonStr = execFileSync("claude", [
      "-p", prompt,
      "--output-format", "text",
    ], {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 5 * 60 * 1000, // 5 min
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (cliErr) {
    console.log("      Claude CLI not available or failed, trying API via curl ...");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("Error: Neither `claude` CLI nor ANTHROPIC_API_KEY available.");
      console.error("Install Claude CLI or set ANTHROPIC_API_KEY env var.");
      cleanupTemp(promptPath);
      process.exit(1);
    }

    const requestBody = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });

    const requestPath = path.join(args.outputDir, ".llm-request.tmp");
    fs.writeFileSync(requestPath, requestBody);

    const response = execSync(
      `curl -s https://api.anthropic.com/v1/messages ` +
      `-H "x-api-key: ${apiKey}" ` +
      `-H "anthropic-version: 2023-06-01" ` +
      `-H "content-type: application/json" ` +
      `-d @"${requestPath}"`,
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 5 * 60 * 1000 }
    );

    cleanupTemp(requestPath);
    const parsed = JSON.parse(response);
    if (parsed.error) {
      console.error("API error:", parsed.error.message);
      cleanupTemp(promptPath);
      process.exit(1);
    }
    jsonStr = parsed.content[0].text;
  }

  cleanupTemp(promptPath);

  // Extract JSON from response (may have markdown fences)
  jsonStr = jsonStr.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  const data = JSON.parse(jsonStr);
  console.log(`      → ${data.sections.length} sections, ${data.summary.length} summary points`);
  return data;
}

function cleanupTemp(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
}

// ─── Step 3: Render HTML ─────────────────────────────────────────────────────

function renderHtml(data, screenshotsDir, outputDir) {
  console.log("[3/4] Rendering HTML ...");

  const screenshotsRel = screenshotsDir
    ? path.relative(outputDir, screenshotsDir)
    : null;

  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderText(text) {
    // Bold markers
    let html = escHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/&ldquo;/g, "&ldquo;")
      .replace(/&rdquo;/g, "&rdquo;");
    // Paragraphs
    const parts = html.split(/\n\n+/);
    if (parts.length > 1) {
      return parts.map((p, i) => i === 0 ? `<p>${p}</p>` : `<p style="margin-top:8px">${p}</p>`).join("\n    ");
    }
    return `<p>${html}</p>`;
  }

  const isWolfgang = (speaker) =>
    speaker.toLowerCase().includes(data.presenter.split(" ")[0].toLowerCase());

  let sectionsHtml = "";
  for (const section of data.sections) {
    let screenshotHtml = "";
    if (section.screenshot && screenshotsRel) {
      screenshotHtml = `
  <figure class="screenshot">
    <img src="${screenshotsRel}/${escHtml(section.screenshot)}" alt="${escHtml(section.screenshotCaption || section.title)}">
    <figcaption>${escHtml(section.screenshotCaption || "")}</figcaption>
  </figure>`;
    }

    let entriesHtml = "";
    for (const entry of section.entries) {
      const isPresenter = isWolfgang(entry.speaker);
      if (entry.type === "callout") {
        entriesHtml += `
  <div class="callout">
    <div class="label">${escHtml(entry.speaker === data.presenter ? "Callout" : "Hinweis")}</div>
    ${renderText(entry.text)}
  </div>`;
      } else if (entry.type === "best-practice") {
        entriesHtml += `
  <div class="best-practice">
    ${renderText(entry.text)}
  </div>`;
      } else {
        const cls = isPresenter ? "wolfgang" : "audience";
        const label = isPresenter ? data.presenter : data.audience_label;
        entriesHtml += `
  <div class="dialog ${cls}">
    <div class="speaker">${escHtml(label)}</div>
    ${renderText(entry.text)}
  </div>`;
      }
    }

    sectionsHtml += `
<div class="section">
  <h2>${section.number}. ${escHtml(section.title)} <span style="color:var(--color-muted);font-weight:400;font-size:14px">(${escHtml(section.timeRange)})</span></h2>
  ${screenshotHtml}
  ${entriesHtml}
</div>

<hr>
`;
  }

  const summaryItems = data.summary
    .map((s) => `    <li>${renderText(s).replace(/<\/?p>/g, "")}</li>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="${data.lang || "de"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(data.title)}</title>
${HTML_STYLES}
</head>
<body>

<div class="header">
  <h1>${escHtml(data.title)}</h1>
  <div class="meta">
    <span>${escHtml(data.date)}</span>
    <span>Dauer: ${escHtml(data.duration)}</span>
  </div>
  <div class="meta">
    <span><strong>Presenter:</strong> ${escHtml(data.presenter)}</span>
    <span><strong>${escHtml(data.audience_label)}:</strong> ${escHtml(data.audience_description)}</span>
  </div>
</div>

${sectionsHtml}

<div class="summary">
  <h2>Kernaussagen zusammengefasst</h2>
  <ol>
${summaryItems}
  </ol>
</div>

<div style="text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid var(--color-border);color:var(--color-muted);font-size:12px">
  Generiert aus der Besprechungsaufzeichnung vom ${escHtml(data.date)} &middot; Condensed by AI
</div>

</body>
</html>`;

  return html;
}

// CSS extracted as a constant so the template stays readable
const HTML_STYLES = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --color-primary: #1a365d;
    --color-accent: #2b6cb0;
    --color-bg: #ffffff;
    --color-text: #1a202c;
    --color-muted: #718096;
    --color-border: #e2e8f0;
    --color-wolfgang: #2b6cb0;
    --color-audience: #2f855a;
    --color-callout-bg: #ebf8ff;
    --color-callout-border: #90cdf4;
    --color-summary-bg: #f7fafc;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--color-text);
    background: var(--color-bg);
    line-height: 1.7;
    font-size: 15px;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 24px;
  }

  .header {
    text-align: center;
    margin-bottom: 48px;
    padding-bottom: 32px;
    border-bottom: 3px solid var(--color-primary);
  }
  .header h1 {
    font-size: 26px;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: 16px;
    line-height: 1.3;
  }
  .meta {
    display: flex;
    justify-content: center;
    gap: 32px;
    margin-top: 16px;
    font-size: 14px;
    color: var(--color-muted);
    flex-wrap: wrap;
  }
  .meta span { white-space: nowrap; }

  .section { margin-bottom: 40px; page-break-inside: avoid; }
  .section h2 {
    font-size: 19px;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--color-border);
  }

  .screenshot { margin: 16px 0; text-align: center; }
  .screenshot img {
    max-width: 100%;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .screenshot figcaption {
    font-size: 12px;
    color: var(--color-muted);
    margin-top: 6px;
    font-style: italic;
  }

  .dialog {
    margin: 12px 0;
    padding: 12px 16px;
    border-radius: 6px;
    background: #f8fafc;
  }
  .dialog.wolfgang { border-left: 4px solid var(--color-wolfgang); }
  .dialog.audience { border-left: 4px solid var(--color-audience); }
  .dialog .speaker {
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .dialog.wolfgang .speaker { color: var(--color-wolfgang); }
  .dialog.audience .speaker { color: var(--color-audience); }
  .dialog p { margin-top: 4px; }

  .callout {
    margin: 16px 0;
    padding: 14px 18px;
    background: var(--color-callout-bg);
    border-left: 4px solid var(--color-callout-border);
    border-radius: 4px;
    font-size: 14px;
  }
  .callout .label {
    font-weight: 700;
    color: var(--color-accent);
    margin-bottom: 4px;
  }

  .best-practice {
    margin: 12px 0;
    padding: 12px 16px;
    background: #fffff0;
    border-left: 4px solid #ecc94b;
    border-radius: 4px;
  }
  .best-practice strong { color: var(--color-primary); }

  .summary {
    margin-top: 40px;
    padding: 24px;
    background: var(--color-summary-bg);
    border-radius: 8px;
    border: 1px solid var(--color-border);
  }
  .summary h2 { border-bottom: none; margin-bottom: 12px; }
  .summary ol { padding-left: 20px; }
  .summary li { margin-bottom: 8px; }

  hr {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 32px 0;
  }

  @media print {
    body { padding: 20px; font-size: 12px; max-width: none; }
    .section { page-break-inside: avoid; }
    .screenshot img {
      max-height: 280px;
      object-fit: contain;
      box-shadow: none;
    }
    .header { margin-bottom: 24px; padding-bottom: 16px; }
    .dialog, .callout, .best-practice { break-inside: avoid; }
  }
</style>`;

// ─── Step 4: Generate PDF ────────────────────────────────────────────────────

function generatePdf(htmlPath, pdfPath) {
  console.log("[4/4] Generating PDF via weasyprint ...");
  try {
    execSync(
      `python3 -c "from weasyprint import HTML; HTML('${htmlPath}').write_pdf('${pdfPath}')"`,
      { stdio: "pipe", timeout: 60 * 1000 }
    );
    const size = (fs.statSync(pdfPath).size / (1024 * 1024)).toFixed(1);
    console.log(`      → ${pdfPath} (${size} MB)`);
  } catch (err) {
    console.error("Error: weasyprint failed. Install with: pip install weasyprint");
    console.error(err.stderr?.toString() || err.message);
    process.exit(1);
  }
}

// ─── Discover screenshots ────────────────────────────────────────────────────

function discoverScreenshots(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort();
}

// ─── Derive output filename ──────────────────────────────────────────────────

function deriveBasename(inputPath) {
  const name = path.basename(inputPath, path.extname(inputPath));
  // Simplify: strip timestamps, "Besprechungsaufzeichnung" etc.
  return name
    .replace(/-?\d{8}_\d{6}/g, "")
    .replace(/-?Besprechungsaufzeichnung.*$/i, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    || "meeting-notes";
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const basename = deriveBasename(args.input);
  const screenshotNames = discoverScreenshots(args.screenshots);

  // Ensure output dir exists
  fs.mkdirSync(args.outputDir, { recursive: true });

  const jsonPath = path.join(args.outputDir, `${basename}.sections.json`);
  const htmlPath = path.join(args.outputDir, `${basename}.html`);
  const pdfPath = path.join(args.outputDir, `${basename}.pdf`);

  // Step 1: Extract text
  const transcript = extractText(args.input);

  // Step 2: LLM condensation
  let data;
  if (args.skipLlm) {
    console.log("[2/4] Skipping LLM — loading existing JSON ...");
    data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } else {
    data = condenseLlm(transcript, args, screenshotNames);
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`      → Saved to ${jsonPath}`);
  }

  // Step 3: Render HTML
  const html = renderHtml(data, args.screenshots, args.outputDir);
  fs.writeFileSync(htmlPath, html);
  console.log(`      → ${htmlPath}`);

  // Step 4: PDF
  if (!args.skipPdf) {
    generatePdf(htmlPath, pdfPath);
  } else {
    console.log("[4/4] Skipping PDF generation (--skip-pdf)");
  }

  console.log("\nDone! Output files:");
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  HTML: ${htmlPath}`);
  if (!args.skipPdf) console.log(`  PDF:  ${pdfPath}`);
}

main();
