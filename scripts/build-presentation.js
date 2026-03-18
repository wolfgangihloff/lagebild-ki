/**
 * build-presentation.js
 *
 * Bundles the Reveal.js presentation into a self-contained folder
 * that can be deployed as a static site (Netlify, Vercel, S3, Hetzner, etc.)
 *
 * What it does:
 *   1. Copies slides/*.html fragments
 *   2. Copies assets/ (logos, favicons, usage-stats.json)
 *   3. Vendors CSS/JS from node_modules/ into vendor/
 *   4. Rewrites index.html paths from node_modules/ → vendor/
 *   5. Copies favicon.ico
 *
 * Output: presentation/ (fully self-contained, no node_modules needed)
 *
 * Usage:
 *   node scripts/build-presentation.js [--output-dir <dir>] [--clean]
 *
 * Options:
 *   --output-dir <dir>   Output directory (default: "presentation")
 *   --clean              Remove output dir before building
 *   --help               Show this help
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// ─── Config: files to vendor from node_modules ──────────────────────────────

const VENDOR_MAP = {
  // source (relative to node_modules/) → destination (relative to vendor/)
  "reveal.js/dist/reveal.css": "reveal.js/reveal.css",
  "reveal.js/dist/theme/white.css": "reveal.js/theme/white.css",
  "reveal.js/dist/reveal.js": "reveal.js/reveal.js",
  "@spectrum-css/tokens/dist/css/index.css": "spectrum/tokens.css",
  "@spectrum-css/page/dist/index.css": "spectrum/page.css",
  "@spectrum-css/typography/dist/index.css": "spectrum/typography.css",
  "@spectrum-css/divider/dist/index.css": "spectrum/divider.css",
};

// ─── Config: path rewrites in index.html ────────────────────────────────────

const PATH_REWRITES = {
  'href="node_modules/reveal.js/dist/reveal.css"': 'href="vendor/reveal.js/reveal.css"',
  'href="node_modules/reveal.js/dist/theme/white.css"': 'href="vendor/reveal.js/theme/white.css"',
  'src="node_modules/reveal.js/dist/reveal.js"': 'src="vendor/reveal.js/reveal.js"',
  'href="node_modules/@spectrum-css/tokens/dist/css/index.css"': 'href="vendor/spectrum/tokens.css"',
  'href="node_modules/@spectrum-css/page/dist/index.css"': 'href="vendor/spectrum/page.css"',
  'href="node_modules/@spectrum-css/typography/dist/index.css"': 'href="vendor/spectrum/typography.css"',
  'href="node_modules/@spectrum-css/divider/dist/index.css"': 'href="vendor/spectrum/divider.css"',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rmDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const args = { outputDir: "presentation", clean: false };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--output-dir":
        args.outputDir = argv[++i];
        break;
      case "--clean":
        args.clean = true;
        break;
      case "--help":
        console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1]);
        process.exit(0);
        break;
    }
  }
  return args;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const outDir = path.resolve(ROOT, args.outputDir);

  if (args.clean) {
    console.log(`Cleaning ${args.outputDir}/ ...`);
    rmDirSync(outDir);
  }

  fs.mkdirSync(outDir, { recursive: true });
  let fileCount = 0;

  // 1. Vendor CSS/JS from node_modules
  console.log("[1/5] Vendoring CSS/JS ...");
  for (const [src, dest] of Object.entries(VENDOR_MAP)) {
    const srcPath = path.join(ROOT, "node_modules", src);
    const destPath = path.join(outDir, "vendor", dest);
    if (!fs.existsSync(srcPath)) {
      console.error(`  MISSING: node_modules/${src} — run npm install first`);
      process.exit(1);
    }
    copyFileSync(srcPath, destPath);
    fileCount++;
  }
  console.log(`      → ${Object.keys(VENDOR_MAP).length} files vendored`);

  // 2. Copy slides/
  console.log("[2/5] Copying slides/ ...");
  const slidesDir = path.join(ROOT, "slides");
  const slidesDest = path.join(outDir, "slides");
  if (fs.existsSync(slidesDir)) {
    copyDirSync(slidesDir, slidesDest);
    const slideCount = fs.readdirSync(slidesDest).filter((f) => f.endsWith(".html")).length;
    fileCount += slideCount;
    console.log(`      → ${slideCount} slide fragments`);
  } else {
    console.error("  ERROR: slides/ directory not found");
    process.exit(1);
  }

  // 3. Copy assets/
  console.log("[3/5] Copying assets/ ...");
  const assetsDir = path.join(ROOT, "assets");
  const assetsDest = path.join(outDir, "assets");
  if (fs.existsSync(assetsDir)) {
    copyDirSync(assetsDir, assetsDest);
    const assetCount = fs.readdirSync(assetsDest).length;
    fileCount += assetCount;
    console.log(`      → ${assetCount} asset files`);
  }

  // 4. Copy favicon.ico
  console.log("[4/5] Copying favicon ...");
  const faviconSrc = path.join(ROOT, "favicon.ico");
  if (fs.existsSync(faviconSrc)) {
    copyFileSync(faviconSrc, path.join(outDir, "favicon.ico"));
    fileCount++;
  }

  // 5. Rewrite and copy index.html
  console.log("[5/5] Rewriting index.html paths ...");
  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  let rewrites = 0;
  for (const [find, replace] of Object.entries(PATH_REWRITES)) {
    if (html.includes(find)) {
      html = html.replace(find, replace);
      rewrites++;
    }
  }
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  fileCount++;
  console.log(`      → ${rewrites} paths rewritten`);

  // Summary
  const totalSize = dirSize(outDir);
  console.log(`\nDone! ${fileCount} files → ${args.outputDir}/`);
  console.log(`Total size: ${(totalSize / (1024 * 1024)).toFixed(1)} MB`);
  console.log(`\nDeploy with any static file server:`);
  console.log(`  npx serve ${args.outputDir}`);
  console.log(`  # or upload ${args.outputDir}/ to Netlify, Vercel, S3, etc.`);
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(fullPath);
    } else {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

main();
