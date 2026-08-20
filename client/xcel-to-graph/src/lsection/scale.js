/**
 * scale.js — the vertical scale, the level datum, and how rows split into sheets.
 *
 * One vertical scale is chosen for the WHOLE drawing set and never varies. That
 * is what makes sheets comparable and what makes the printed scale true — the
 * old output auto-scaled every page while printing a fixed "1:1350".
 *
 * The datum is separate from the scale. Two modes:
 *   'perSheet' (default) — each sheet gets its own datum, snapped down to a
 *       round level, so a 45 km canal with 42 m of fall does not leave two
 *       thirds of every sheet as blank grid. The datum is printed on the sheet,
 *       which is normal drafting practice.
 *   'global' — one datum for every sheet, matching the reference drawing.
 *       Directly comparable sheet to sheet, at the cost of a lot of white space.
 */

import { V_SCALES } from './geometry.js';

// Whole metres are the drawing convention; coarser steps are a fallback for
// very small scales where 1 m lines would be closer than 4 mm on paper.
const MAJOR_STEPS = [1, 2, 5, 10, 20];

function extentOf(rows) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    lo = Math.min(lo, r.gl, r.cbl, r.fsl, r.tbl);
    hi = Math.max(hi, r.gl, r.cbl, r.fsl, r.tbl);
  }
  return { lo, hi };
}

/** Gridline spacing that keeps major lines at least 6 mm apart on paper. */
function gridFor(vScale) {
  const perMetre = 1000 / vScale;
  const major = MAJOR_STEPS.find((s) => s * perMetre >= 4) ?? 20;
  const minor = (major / 2) * perMetre >= 4 ? major / 2 : null;
  return { major, minor };
}

/**
 * Pick the single vertical scale for the whole set.
 *
 * @param {Array<Array>} sheets paginated rows
 * @param {number} availH_mm plot band height
 * @param {'perSheet'|'global'} mode
 * @param {number|null} forced e.g. 100 to pin it to 1:100
 */
export function chooseVerticalScale(sheets, availH_mm, mode = 'perSheet', forced = null) {
  let need;
  if (mode === 'global') {
    const { lo, hi } = extentOf(sheets.flat());
    need = hi - lo;
  } else {
    need = 0;
    for (const s of sheets) {
      const { lo, hi } = extentOf(s);
      need = Math.max(need, hi - lo);
    }
  }
  need += 2; // a metre of air above and below

  const candidates = forced ? [forced] : V_SCALES;
  let vScale = candidates[candidates.length - 1];
  for (const s of candidates) {
    if ((need * 1000) / s <= availH_mm) {
      vScale = s;
      break;
    }
  }
  return {
    vScale,
    ...gridFor(vScale),
    needRange: need,
    fits: (need * 1000) / vScale <= availH_mm + 0.01,
  };
}

/**
 * Build a datum band for one extent at a fixed scale.
 * The datum is snapped DOWN to a whole gridline so the printed value is round.
 */
export function makeDatum(lo, hi, availH_mm, vScale, major) {
  const capacity = (availH_mm * vScale) / 1000; // metres the band can show
  const need = hi - lo + 2;
  const slack = Math.max(0, capacity - need);
  const datumMin = Math.floor((lo - 1 - slack / 2) / major) * major;
  return {
    datumMin,
    datumMax: datumMin + capacity,
    range: capacity,
    vScale,
    major,
    minor: gridFor(vScale).minor,
    dataMin: lo,
    dataMax: hi,
    fits: hi <= datumMin + capacity && lo >= datumMin,
  };
}

/**
 * Produce one datum per sheet, honouring the chosen mode.
 * @returns {Array<object>} same length as `sheets`
 */
export function buildDatums(sheets, availH_mm, scale, mode = 'perSheet') {
  const { vScale, major } = scale;
  if (mode === 'global') {
    const { lo, hi } = extentOf(sheets.flat());
    const d = makeDatum(lo, hi, availH_mm, vScale, major);
    return sheets.map(() => d);
  }
  return sheets.map((s) => {
    const { lo, hi } = extentOf(s);
    return makeDatum(lo, hi, availH_mm, vScale, major);
  });
}

/**
 * Split rows into sheets.
 *
 * `overlap` repeats the last point of a sheet as the first point of the next,
 * so the profile reads continuously across the match line instead of breaking
 * at every sheet edge.
 */
export function paginate(rows, pointsPerSheet = 45, overlap = true) {
  const n = Math.max(5, Math.min(200, Math.round(pointsPerSheet)));
  const step = overlap ? n - 1 : n;
  const sheets = [];
  for (let i = 0; i < rows.length; i += step) {
    const slice = rows.slice(i, i + n);
    if (slice.length < 2 && sheets.length) break; // a lone trailing point is already shown
    sheets.push(slice);
    if (i + n >= rows.length) break;
  }
  return sheets;
}