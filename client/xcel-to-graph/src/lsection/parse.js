/**
 * parse.js — read the survey workbook and validate it as engineering data.
 *
 * The guiding rule: never silently drop or alter a value. Anything that cannot
 * be plotted is reported back with its source row number so the engineer can
 * fix the workbook, rather than discovering a missing chainage on a printed
 * sheet. The old Python did `df.dropna(...)` and lost three rows without
 * saying so.
 */

import * as XLSX from 'xlsx';

export const REQUIRED = ['CH', 'GL', 'CBL', 'FSL', 'TBL'];

const norm = (s) => String(s ?? '').trim().toUpperCase().replace(/[\s._-]+/g, '');

/** Accepted header spellings for each required column. */
const ALIASES = {
  CH: ['CH', 'CHAINAGE', 'CHAINAGEKM', 'CHAINAGEM', 'CHKM', 'CHM'],
  GL: ['GL', 'GROUNDLEVEL', 'NGL', 'EGL', 'EXISTINGGROUNDLEVEL'],
  CBL: ['CBL', 'BEDLEVEL', 'CANALBEDLEVEL', 'BL'],
  FSL: ['FSL', 'FULLSUPPLYLEVEL', 'WL', 'WATERLEVEL'],
  TBL: ['TBL', 'TOPOFBANKLEVEL', 'BANKLEVEL', 'TOPBANKLEVEL'],
};

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Format a chainage in metres as the drawing convention `26+986`. */
export function chainageLabel(metres) {
  const m = Math.round(metres);
  const sign = m < 0 ? '-' : '';
  const a = Math.abs(m);
  const km = Math.floor(a / 1000);
  const rem = a % 1000;
  return `${sign}${km}+${String(rem).padStart(3, '0')}`;
}

/**
 * Locate the header row and map required columns to their indices.
 * Scans the first 20 rows so a sheet with a banner above the table still works.
 */
function findHeader(grid) {
  for (let r = 0; r < Math.min(grid.length, 20); r++) {
    const cells = (grid[r] || []).map(norm);
    const idx = {};
    for (const key of REQUIRED) {
      const want = ALIASES[key];
      const at = cells.findIndex((c) => c && want.includes(c));
      if (at >= 0) idx[key] = at;
    }
    if (REQUIRED.every((k) => idx[k] !== undefined)) return { headerRow: r, idx };
  }
  return null;
}

/**
 * Pick the sheet that actually contains the L-section table.
 * @returns {{name: string, grid: any[][], header: {headerRow:number, idx:object}}}
 */
function pickSheet(wb) {
  for (const name of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      raw: true,
      blankrows: true,
      defval: null,
    });
    const header = findHeader(grid);
    if (header) return { name, grid, header };
  }
  return null;
}

/**
 * Parse an uploaded workbook or CSV into validated survey rows.
 *
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {{
 *   rows: Array<{ch:number, gl:number, cbl:number, fsl:number, tbl:number, srcRow:number}>,
 *   sheetName: string,
 *   unit: 'km'|'m',
 *   errors: string[],
 *   warnings: string[],
 *   skipped: Array<{srcRow:number, reason:string}>
 * }}
 */
export function parseSurvey(buffer) {
  const errors = [];
  const warnings = [];
  const skipped = [];

  let wb;
  try {
    wb = XLSX.read(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer), {
      type: 'array',
      cellDates: false,
    });
  } catch (e) {
    return { rows: [], sheetName: '', unit: 'm', errors: [`Could not read the file: ${e.message}`], warnings, skipped };
  }

  const picked = pickSheet(wb);
  if (!picked) {
    return {
      rows: [],
      sheetName: '',
      unit: 'm',
      errors: [
        `No sheet contains all five required columns (${REQUIRED.join(', ')}). ` +
          `Sheets checked: ${wb.SheetNames.join(', ')}.`,
      ],
      warnings,
      skipped,
    };
  }

  const { name: sheetName, grid, header } = picked;
  const { headerRow, idx } = header;

  // ── Read rows ────────────────────────────────────────────────────────────
  const raw = [];
  for (let r = headerRow + 1; r < grid.length; r++) {
    const line = grid[r] || [];
    const srcRow = r + 1; // 1-based, matches the spreadsheet's own numbering
    const vals = {
      ch: toNumber(line[idx.CH]),
      gl: toNumber(line[idx.GL]),
      cbl: toNumber(line[idx.CBL]),
      fsl: toNumber(line[idx.FSL]),
      tbl: toNumber(line[idx.TBL]),
    };

    const allBlank = Object.values(vals).every((v) => v === null);
    if (allBlank) continue; // genuinely empty row, not worth reporting

    if (vals.ch === null) {
      skipped.push({ srcRow, reason: 'no chainage' });
      continue;
    }
    const missing = ['gl', 'cbl', 'fsl', 'tbl'].filter((k) => vals[k] === null);
    if (missing.length) {
      skipped.push({
        srcRow,
        reason: `chainage ${vals.ch} has no ${missing.map((m) => m.toUpperCase()).join(', ')}`,
      });
      continue;
    }
    raw.push({ ...vals, srcRow });
  }

  if (!raw.length) {
    errors.push('The file has the right columns but no complete rows of data.');
    return { rows: [], sheetName, unit: 'm', errors, warnings, skipped };
  }

  // ── Chainage units ───────────────────────────────────────────────────────
  // Decided once, globally, from the full range — never per page.
  const chMax = Math.max(...raw.map((r) => r.ch));
  const unit = chMax < 1000 ? 'km' : 'm';
  const k = unit === 'km' ? 1000 : 1;
  for (const r of raw) r.ch = Math.round(r.ch * k * 1000) / 1000;

  // ── Order ────────────────────────────────────────────────────────────────
  const wasSorted = raw.every((r, i) => i === 0 || r.ch >= raw[i - 1].ch);
  const rows = wasSorted ? raw : [...raw].sort((a, b) => a.ch - b.ch);
  if (!wasSorted) warnings.push('Rows were not in chainage order; they have been sorted ascending.');

  // ── Engineering sanity checks ────────────────────────────────────────────
  const dup = [];
  const noDepth = [];
  const noFreeboard = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (i > 0 && Math.abs(r.ch - rows[i - 1].ch) < 1e-6) dup.push(chainageLabel(r.ch));
    if (r.fsl <= r.cbl) noDepth.push(chainageLabel(r.ch));
    if (r.tbl <= r.fsl) noFreeboard.push(chainageLabel(r.ch));
  }
  const brief = (list, n = 6) =>
    list.slice(0, n).join(', ') + (list.length > n ? ` … (+${list.length - n} more)` : '');

  if (dup.length) warnings.push(`Duplicate chainage at ${brief(dup)}. Both rows are plotted.`);
  if (noDepth.length) warnings.push(`FSL is at or below CBL at ${brief(noDepth)} — check the design levels.`);
  if (noFreeboard.length) warnings.push(`TBL is at or below FSL (no freeboard) at ${brief(noFreeboard)}.`);
  if (skipped.length) {
    warnings.push(
      `${skipped.length} row${skipped.length === 1 ? '' : 's'} left out of the drawing — ` +
        `${brief(skipped.map((s) => `row ${s.srcRow} (${s.reason})`), 4)}`,
    );
  }

  return { rows, sheetName, unit, errors, warnings, skipped };
}
