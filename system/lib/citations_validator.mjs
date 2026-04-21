#!/usr/bin/env node
/**
 * citations_validator.mjs
 *
 * Reads system/telemetry/agent_runs.jsonl and validates every citation in
 * `learnings_used` field against the actual learnings .md files.
 *
 * Citation format: "<slug>#<section-anchor>"
 *   slug  → subagent folder name, e.g. "backend-expert"
 *   anchor → GitHub-flavored markdown heading slug
 *
 * Exit code 0 when hallucination_rate < 0.1, else 1.
 *
 * Usage: node system/lib/citations_validator.mjs
 *   (run from vault root)
 */

import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants } from 'node:fs';

// ---------------------------------------------------------------------------
// Anchor generation — GitHub Flavored Markdown
// ---------------------------------------------------------------------------

/**
 * Converts a markdown heading text to a GFM anchor.
 *
 * Rules:
 *  1. lowercase
 *  2. remove all punctuation EXCEPT hyphens and underscores
 *  3. replace spaces (and runs of spaces) with a single hyphen
 *  4. trim leading/trailing hyphens produced in step 3
 *
 * Examples:
 *   "Rules of Hooks (React 18)"  → "rules-of-hooks-react-18"
 *   "## p-retry — AbortError"    → "p-retry--aborterror"
 *   "Zod v4 (4.x)"               → "zod-v4-4x"
 */
function headingToAnchor(headingText) {
  return headingText
    .toLowerCase()
    // remove leading '#' characters (in case the raw line is passed in)
    .replace(/^#+\s*/, '')
    // remove punctuation except - and _
    .replace(/[^\w\s\-]/g, '')
    // collapse whitespace to hyphens
    .replace(/\s+/g, '-')
    // collapse multiple consecutive hyphens (optional, GFM does NOT collapse
    // them, but we strip non-word chars first which handles most cases)
    .trim();
}

// ---------------------------------------------------------------------------
// Extract headings from a markdown file → Set of anchors
// ---------------------------------------------------------------------------

/**
 * @param {string} content - raw markdown content
 * @returns {Set<string>} set of generated anchors for all ATX headings
 */
function extractAnchors(content) {
  const anchors = new Set();
  // Match ATX-style headings: # / ## / ### etc.
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    anchors.add(headingToAnchor(match[1]));
  }
  return anchors;
}

// ---------------------------------------------------------------------------
// Cache: slug → { exists: bool, anchors: Set|null }
// ---------------------------------------------------------------------------
const fileCache = new Map();

/**
 * Resolve the learnings.md path for a given slug.
 * slug can be "backend-expert", "frontend-expert", "scout", etc.
 * The file lives at:  research/subagents/<slug>/learnings.md
 */
function learningsPath(vaultRoot, slug) {
  return join(vaultRoot, 'research', 'subagents', slug, 'learnings.md');
}

async function getFileInfo(vaultRoot, slug) {
  if (fileCache.has(slug)) return fileCache.get(slug);

  const filePath = learningsPath(vaultRoot, slug);
  let info;
  try {
    await access(filePath, constants.R_OK);
    const content = await readFile(filePath, 'utf8');
    info = { exists: true, anchors: extractAnchors(content) };
  } catch {
    info = { exists: false, anchors: null };
  }
  fileCache.set(slug, info);
  return info;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const vaultRoot = resolve(dirname(__filename), '..', '..');

  const jsonlPath = join(vaultRoot, 'system', 'telemetry', 'agent_runs.jsonl');

  let rawContent;
  try {
    rawContent = await readFile(jsonlPath, 'utf8');
  } catch (err) {
    process.stderr.write(`ERROR: cannot read agent_runs.jsonl: ${err.message}\n`);
    process.exit(2);
  }

  const lines = rawContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let checkedRuns = 0;
  let totalCitations = 0;
  const missingFile = [];
  const missingAnchor = [];

  for (const line of lines) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      // Skip malformed lines silently
      continue;
    }

    const { run_id, agent, learnings_used } = record;

    // Skip records without learnings_used (not all agents write citations)
    if (!Array.isArray(learnings_used) || learnings_used.length === 0) {
      continue;
    }

    checkedRuns++;

    for (const citation of learnings_used) {
      totalCitations++;

      const hashIdx = citation.indexOf('#');
      if (hashIdx === -1) {
        // Malformed citation — no anchor separator, treat as missing_anchor
        missingAnchor.push({ run_id, agent, anchor: citation, file_exists: false });
        continue;
      }

      const slug = citation.slice(0, hashIdx);
      const anchor = citation.slice(hashIdx + 1);

      const info = await getFileInfo(vaultRoot, slug);

      if (!info.exists) {
        missingFile.push({ run_id, agent, anchor: citation });
        continue;
      }

      if (!info.anchors.has(anchor)) {
        missingAnchor.push({ run_id, agent, anchor: citation, file_exists: true });
      }
    }
  }

  const invalid = missingFile.length + missingAnchor.length;
  const valid = totalCitations - invalid;
  const hallucinationRate =
    totalCitations === 0 ? 0 : Math.round((invalid / totalCitations) * 1000) / 1000;

  const result = {
    checked_runs: checkedRuns,
    total_citations: totalCitations,
    valid,
    missing_file: missingFile,
    missing_anchor: missingAnchor,
    hallucination_rate: hallucinationRate,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');

  if (hallucinationRate >= 0.1) {
    process.stderr.write(
      `FAIL: hallucination_rate=${hallucinationRate} >= 0.10 threshold\n`
    );
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`FATAL: ${err.stack}\n`);
  process.exit(2);
});
