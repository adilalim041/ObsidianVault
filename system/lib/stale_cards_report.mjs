#!/usr/bin/env node
// stale_cards_report.mjs — weekly vault hygiene report.
// Run from vault root:  node system/lib/stale_cards_report.mjs
// Exit code 0 = nothing to do, 1 = there are stale/orphan entries.
// Stdlib only (fs/promises, path).

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep, basename } from 'node:path';

const VAULT_ROOT = process.cwd();
const CANDIDATES_DIR = join(VAULT_ROOT, 'research', 'candidates');
const LIBRARY_DIR = join(VAULT_ROOT, 'research', 'library');
const STUDIES_DIR = join(VAULT_ROOT, 'research', 'studies');

const DAY_MS = 86400000;
const PROMOTED_STALE_DAYS = 14;
const LIBRARY_STALE_DAYS = 90;
const CITATION_WINDOW_DAYS = 30;

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

function daysSince(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((today.getTime() - d.getTime()) / DAY_MS);
}

// Recursively list files under a dir (markdown by default). Returns absolute paths.
// Ignores hidden folders (leading '.' or '_') except we keep '_index.md' files.
async function walk(dir, { ext = '.md' } = {}) {
  let out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('.')) continue;
      out = out.concat(await walk(full, { ext }));
    } else if (e.isFile() && (!ext || e.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

// Candidate filenames look like: YYYY-MM-DD-<owner>-<repo>.md
// Returns { date, slug } where slug is the part after the leading date.
function parseCandidateName(filename) {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+?)\.md$/);
  if (!m) return null;
  return { date: m[1], slug: m[2] };
}

// Study directories look like: YYYY-MM-DD-<slug>/  (slug without owner sometimes).
// We return the trailing slug part for fuzzy matching.
function parseStudyDirName(name) {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (!m) return { date: null, slug: name };
  return { date: m[1], slug: m[2] };
}

// Read one file and extract status + a "promoted" date if present.
async function readCandidateMeta(filepath) {
  const text = await readFile(filepath, 'utf8');
  const statusMatch = text.match(/^\*\*Status:\*\*\s*(.+)$/mi);
  const status = statusMatch ? statusMatch[1].trim() : null;
  const promotedMatch = text.match(/\*\*Promoted:\*\*\s*(\d{4}-\d{2}-\d{2})/i);
  const promoted = promotedMatch ? promotedMatch[1] : null;
  const tierMatch = text.match(/\*\*Tier:\*\*\s*([AB])/i);
  const tier = tierMatch ? tierMatch[1] : '?';
  return { status, promoted, tier, text };
}

// A candidate counts as "promoted but not studied" if:
//   - its Status starts with "promoted" (e.g. "promoted-pending")
//   - it is NOT marked as "studied" / "skipped"
//   - no study directory slug matches this candidate's slug
// We fall back to using the candidate's own date if no **Promoted:** line exists.
async function findPromotedButNotStudied() {
  const files = await walk(CANDIDATES_DIR);
  const studyDirs = await listStudySlugs();
  const result = [];
  for (const f of files) {
    const name = basename(f);
    const parsed = parseCandidateName(name);
    if (!parsed) continue;
    const meta = await readCandidateMeta(f);
    const status = (meta.status || '').toLowerCase();
    const isPromoted = status.startsWith('promoted');
    if (!isPromoted) continue;
    // Is there a study that matches this candidate's slug?
    const matched = studyDirs.some((s) => s.slug.includes(parsed.slug) || parsed.slug.includes(s.slug));
    if (matched) continue;
    const refDate = meta.promoted || parsed.date;
    const age = daysSince(refDate);
    if (age == null || age < PROMOTED_STALE_DAYS) continue;
    result.push({
      name,
      slug: parsed.slug,
      ageDays: age,
      tier: meta.tier,
    });
  }
  result.sort((a, b) => b.ageDays - a.ageDays);
  return result;
}

async function listStudySlugs() {
  let entries;
  try {
    entries = await readdir(STUDIES_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    out.push({ dir: e.name, ...parseStudyDirName(e.name) });
  }
  return out;
}

async function findLibraryStale() {
  const files = await walk(LIBRARY_DIR);
  const out = [];
  const re = /\*\*Last verified:\*\*\s*(\d{4}-\d{2}-\d{2})/i;
  for (const f of files) {
    if (basename(f).startsWith('_')) continue; // skip _index.md
    const text = await readFile(f, 'utf8');
    const m = text.match(re);
    if (!m) continue;
    const age = daysSince(m[1]);
    if (age == null || age < LIBRARY_STALE_DAYS) continue;
    out.push({
      path: relative(VAULT_ROOT, f).split(sep).join('/'),
      verified: m[1],
      ageDays: age,
    });
  }
  out.sort((a, b) => b.ageDays - a.ageDays);
  return out;
}

// Orphan study = study dir whose slug is never mentioned in any library/*.md,
// AND whose own directory hasn't been modified in the last 30 days
// (i.e. nobody touched it, no citation came in).
async function findOrphanStudies() {
  const studies = await listStudySlugs();
  if (studies.length === 0) return [];
  // Preload all library text, concatenated once.
  const libFiles = await walk(LIBRARY_DIR);
  const libBlobs = await Promise.all(libFiles.map((f) => readFile(f, 'utf8')));
  const libCorpus = libBlobs.join('\n');

  const out = [];
  for (const s of studies) {
    const dirPath = join(STUDIES_DIR, s.dir);
    let st;
    try {
      st = await stat(dirPath);
    } catch {
      continue;
    }
    const mtimeDays = Math.floor((today.getTime() - st.mtimeMs) / DAY_MS);
    if (mtimeDays < CITATION_WINDOW_DAYS) continue;
    // Check citation: library references the study by its slug or its full dir name.
    const referenced =
      libCorpus.includes(s.dir) || (s.slug && libCorpus.includes(s.slug));
    if (referenced) continue;
    out.push({
      path: `research/studies/${s.dir}`,
      idleDays: mtimeDays,
    });
  }
  out.sort((a, b) => b.idleDays - a.idleDays);
  return out;
}

function formatReport({ promoted, libStale, orphans }) {
  const lines = [];
  lines.push(`# Weekly stale report — ${todayStr}`);
  lines.push('');

  lines.push(`## Promoted but not studied (${PROMOTED_STALE_DAYS}+ days)`);
  if (promoted.length === 0) {
    lines.push('- (none)');
  } else {
    for (const p of promoted) {
      lines.push(`- ${p.slug} — promoted ${p.ageDays} days ago, tier ${p.tier}`);
    }
  }
  lines.push('');

  lines.push(`## Library stale (verified ${LIBRARY_STALE_DAYS}+ days)`);
  if (libStale.length === 0) {
    lines.push('- (none)');
  } else {
    for (const l of libStale) {
      lines.push(`- \`${l.path}\` — last verified ${l.verified} (${l.ageDays} days ago)`);
    }
  }
  lines.push('');

  lines.push(`## Orphan studies (0 citations in ${CITATION_WINDOW_DAYS}d)`);
  if (orphans.length === 0) {
    lines.push('- (none)');
  } else {
    for (const o of orphans) {
      lines.push(`- \`${o.path}\` — idle ${o.idleDays} days`);
    }
  }
  lines.push('');

  const total = promoted.length + libStale.length + orphans.length;
  lines.push('---');
  lines.push(`Total issues: ${total}`);
  return { report: lines.join('\n'), total };
}

async function main() {
  const [promoted, libStale, orphans] = await Promise.all([
    findPromotedButNotStudied(),
    findLibraryStale(),
    findOrphanStudies(),
  ]);
  const { report, total } = formatReport({ promoted, libStale, orphans });
  process.stdout.write(report + '\n');
  process.exit(total === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`stale_cards_report error: ${err.stack || err.message}\n`);
  process.exit(2);
});
