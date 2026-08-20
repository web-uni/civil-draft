/**
 * geometry.js — all drawing geometry for the canal L-section sheet.
 *
 * Everything in this file is authored in MILLIMETRES (the unit engineers think
 * in) and converted to PostScript points exactly once, in buildLayout().
 * pdf-lib's origin is bottom-left with +y upward, which matches the way a
 * drawing sheet is dimensioned, so no axis flipping happens anywhere.
 *
 * Nothing here reads data. Layout is a pure function of sheet size, so it can
 * be unit-tested and diffed against a plotted check print.
 */

export const MM = 2.834645669291339; // 1 mm in PostScript points
export const mm = (v) => v * MM;

/** Landscape sheet sizes, mm. */
export const PAGE_SIZES = {
  A0: [1189, 841],
  A1: [841, 594],
  A2: [594, 420],
  A3: [420, 297],
};

/** Line colours, matched to the reference drawing. */
export const COLORS = {
  GL: [0.80, 0.00, 0.00], // ground level        — red
  TBL: [0.00, 0.31, 0.63], // top of bank level  — blue
  FSL: [0.00, 0.44, 0.00], // full supply level  — green
  CBL: [0.00, 0.48, 0.54], // canal bed level    — teal
  ink: [0.08, 0.08, 0.08],
  inkMid: [0.30, 0.30, 0.30],
  rule: [0.20, 0.20, 0.20], // title block / frame rules
  gridMajor: [0.72, 0.72, 0.72],
  gridMinor: [0.88, 0.88, 0.88],
  colRule: [0.80, 0.80, 0.80], // per-point vertical rules
  bandFill: [0.937, 0.953, 0.969], // alternating table band
  headFill: [0.898, 0.925, 0.949], // table header fill
};

/** Type sizes, pt. Tuned so a 3-decimal level reads cleanly at A1. */
export const FS = {
  cell: 6.2, // rotated table values
  rowHdr: 7.5, // table row labels in the gutter
  yTick: 7.5, // level axis labels
  caption: 10.0, // profile caption under the plot
  zone: 8.0, // frame zone letters/numbers
  datum: 8.0, // datum callout
  tbBody: 8.0, // title block body text
  tbHead: 9.0, // title block section headers
  tbSmall: 7.0, // title block dense cells
  tbTitle: 13.0, // drawing title
};

/**
 * Table rows, top to bottom, exactly as the reference sheet orders them.
 * `key` is either a data column or a derived chainage format.
 */
export const TABLE_ROWS = [
  { key: 'gl', label: 'GL', color: COLORS.GL, h: 10 },
  { key: 'tbl', label: 'TBL', color: COLORS.TBL, h: 10 },
  { key: 'fsl', label: 'FSL', color: COLORS.FSL, h: 10 },
  { key: 'cbl', label: 'CBL', color: COLORS.CBL, h: 10 },
  { key: 'chKm', label: 'CHAINAGE (m)', color: COLORS.ink, h: 10 },
  { key: 'chM', label: '{PREFIX} CHAINAGE (m)', color: COLORS.inkMid, h: 10 },
];

/**
 * Title block bands, top to bottom, in mm.
 *
 * These are sized to their CONTENT, not to the sheet. The block is then
 * anchored to the bottom of the frame, exactly as on the reference drawing —
 * stretching the bands to fill the full frame height is what produced all the
 * dead space inside the block.
 */
const TB_BANDS = [
  { key: 'revisions', h: 30 },
  { key: 'staff', h: 21 },
  { key: 'parties', h: 42 }, // client and contractor, side by side
  { key: 'consultant', h: 30 },
  { key: 'project', h: 44 },
  { key: 'title', h: 28 },
  { key: 'strip', h: 20 },
];

/** The NOTE text sits loose at the top of the right-hand column, unboxed. */
const NOTE_H = 40;

/**
 * Preferred vertical scales, most detailed first.
 *
 * Starts at 1:100 so one metre is 10 mm on paper. Finer than that and the 1 m
 * gridlines spread the design lines (CBL, FSL, TBL sit 1.1–2.4 m apart on this
 * canal) so far up the sheet that the profile stops reading as one section —
 * which is why the reference drawing works at roughly this density.
 */
export const V_SCALES = [100, 125, 150, 200, 250, 300, 400, 500, 750, 1000];

/** Legend swatch geometry, mm. */
export const LEGEND = { pad: 3, h: 9, swatch: 9, gap: 2.5, entry: 21 };

const FRAME = {
  outerInset: 5, // thin outer rule, in from the page edge
  zoneBand: 6, // band carrying zone letters/numbers
  bindExtra: 10, // extra filing margin on the left
};

const TITLE_BLOCK_MAX_W = 190; // ISO-ish title block width
const GUTTER_W = 34; // level labels + table row headers
const PAD = { belowTable: 3, rightOfPlot: 3, aboveFrame: 4, captionH: 9 };

/**
 * Build the full sheet layout, in POINTS.
 * @param {{sheetSize?: string}} opts
 */
export function buildLayout({ sheetSize = 'A1' } = {}) {
  const size = PAGE_SIZES[String(sheetSize).toUpperCase().trim()] || PAGE_SIZES.A1;
  const [W, H] = size;

  // ── Frame ────────────────────────────────────────────────────────────────
  const fx0 = FRAME.outerInset + FRAME.zoneBand + FRAME.bindExtra;
  const fx1 = W - (FRAME.outerInset + FRAME.zoneBand);
  const fy0 = FRAME.outerInset + FRAME.zoneBand;
  const fy1 = H - (FRAME.outerInset + FRAME.zoneBand);
  const frameH = fy1 - fy0;

  // ── Right-hand column: notes at the top, title block at the bottom ───────
  const tbW = Math.min(TITLE_BLOCK_MAX_W, W * 0.25);
  const tbX0 = fx1 - tbW;

  // On a smaller sheet the content-sized block would eat the page, so cap it.
  const bandSum = TB_BANDS.reduce((s, b) => s + b.h, 0);
  const k = Math.min(1, (frameH * 0.55) / (bandSum + NOTE_H));
  TB_BANDS.forEach((b) => (b._h = b.h * k));
  const tbH = bandSum * k;
  const noteH = NOTE_H * k;

  const bands = {};
  let cursor = fy0 + tbH; // bottom-anchored, bands laid downward from its top
  for (const b of TB_BANDS) {
    bands[b.key] = { y1: cursor, y0: cursor - b._h, h: b._h };
    cursor -= b._h;
  }

  // ── Graph column (left) ──────────────────────────────────────────────────
  const dataX0 = fx0 + GUTTER_W;
  const dataX1 = tbX0 - PAD.rightOfPlot;

  const tableH = TABLE_ROWS.reduce((s, r) => s + r.h, 0);
  const tableY0 = fy0 + PAD.belowTable;
  const tableY1 = tableY0 + tableH;
  const captionY0 = tableY1;
  const captionY1 = captionY0 + PAD.captionH;
  const plotY0 = captionY1;
  const plotY1 = fy1 - PAD.aboveFrame;

  // Row bands, top-down.
  const rows = [];
  let ry = tableY1;
  for (const r of TABLE_ROWS) {
    rows.push({ ...r, y1: ry, y0: ry - r.h, h: r.h });
    ry -= r.h;
  }

  const pt = (o) => {
    const out = {};
    for (const [k, v] of Object.entries(o)) out[k] = typeof v === 'number' ? mm(v) : v;
    return out;
  };

  return {
    sheetSize: String(sheetSize).toUpperCase().trim(),
    page: { w: mm(W), h: mm(H) },
    outer: pt({
      x: FRAME.outerInset,
      y: FRAME.outerInset,
      w: W - 2 * FRAME.outerInset,
      h: H - 2 * FRAME.outerInset,
    }),
    frame: pt({ x0: fx0, x1: fx1, y0: fy0, y1: fy1, w: fx1 - fx0, h: frameH }),
    zoneBand: mm(FRAME.zoneBand),
    noteBlock: {
      x0: mm(tbX0),
      x1: mm(fx1),
      w: mm(tbW),
      y1: mm(fy1),
      y0: mm(fy1 - noteH),
      h: mm(noteH),
    },
    titleBlock: {
      x0: mm(tbX0),
      x1: mm(fx1),
      w: mm(tbW),
      y0: mm(fy0),
      y1: mm(fy0 + tbH),
      h: mm(tbH),
      bands: Object.fromEntries(
        Object.entries(bands).map(([k, v]) => [k, { y0: mm(v.y0), y1: mm(v.y1), h: mm(v.h) }]),
      ),
    },
    plot: {
      x0: mm(dataX0),
      x1: mm(dataX1),
      w: mm(dataX1 - dataX0),
      y0: mm(plotY0),
      y1: mm(plotY1),
      h: mm(plotY1 - plotY0),
      availH_mm: plotY1 - plotY0,
    },
    caption: { y0: mm(captionY0), y1: mm(captionY1), h: mm(PAD.captionH) },
    table: {
      x0: mm(dataX0),
      x1: mm(dataX1),
      y0: mm(tableY0),
      y1: mm(tableY1),
      rows: rows.map((r) => ({ ...r, y0: mm(r.y0), y1: mm(r.y1), h: mm(r.h) })),
    },
    gutter: { x0: mm(fx0), x1: mm(dataX0), labelRight: mm(dataX0 - 2) },
  };
}

/**
 * Bottom strip: three columns over two rows, as on the reference.
 * Column 1 is merged across both rows for the sheet size.
 */
export const STRIP_W = [24, 98, 68]; // mm, summing to the title block width
export const STRIP_CELLS = [
  { col: 1, row: 0, label: 'DWG. NO.', key: 'dwgNo' },
  { col: 1, row: 1, label: 'SCALE', key: 'scale' },
  { col: 2, row: 0, label: 'REV.', key: 'rev' },
  { col: 2, row: 1, label: 'DATE', key: 'date' },
];

/** Revision table columns, mm, summing to the title block width. */
export const REV_COLS = [
  { key: 'rev', label: 'REV.', w: 18 },
  { key: 'date', label: 'DATE', w: 34 },
  { key: 'description', label: 'DESCRIPTION', w: 100 },
  { key: 'remarks', label: 'REMARKS', w: 38 },
];