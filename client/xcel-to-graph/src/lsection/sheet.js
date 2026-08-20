/**
 * sheet.js — draws one L-section sheet: frame, level grid, profile, data table.
 *
 * Column geometry is shared between the plot and the table: point i sits at the
 * centre of column i in both, so a value in the table is always directly under
 * its point on the profile. That alignment is the whole reason the drawing is
 * laid out on equal-width columns rather than true chainage spacing.
 */

import { COLORS, FS, LEGEND, mm } from './geometry.js';
import { chainageLabel } from './parse.js';
import { box, hline, vline, text, vtext, polyline } from './draw.js';
import { drawTitleBlock, drawNotes } from './titleBlock.js';

const LW = {
  outer: 0.7,
  frame: 1.2,
  plotBorder: 0.8,
  gridMajor: 0.35,
  gridMinor: 0.22,
  colRule: 0.25,
  profile: 1.15,
  tableHeavy: 0.7,
  tableLight: 0.3,
};

/** Drawing frame: thin outer rule, ruled zone band, heavy inner frame. */
function drawFrame(page, layout, fonts, dropped) {
  const { outer, frame, zoneBand } = layout;
  box(page, outer.x, outer.y, outer.w, outer.h, { stroke: COLORS.rule, lw: LW.outer });
  box(page, frame.x0, frame.y0, frame.w, frame.h, { stroke: COLORS.rule, lw: LW.frame });

  const cols = Math.max(4, Math.min(12, Math.round(frame.w / mm(105))));
  const rows = Math.max(3, Math.min(10, Math.round(frame.h / mm(105))));
  const cw = frame.w / cols;
  const rh = frame.h / rows;
  const letters = 'ABCDEFGHIJ';

  for (let i = 0; i < cols; i++) {
    const cx = frame.x0 + cw * (i + 0.5);
    const label = String(cols - i); // numbered right-to-left, as on the reference
    for (const y of [frame.y1 + zoneBand / 2, frame.y0 - zoneBand / 2]) {
      text(page, label, cx, y, {
        font: fonts.regular, size: FS.zone, color: COLORS.rule, align: 'center', middle: true, dropped,
      });
    }
    if (i > 0) {
      const x = frame.x0 + cw * i;
      vline(page, x, frame.y1, frame.y1 + zoneBand, LW.outer * 0.7, COLORS.rule);
      vline(page, x, frame.y0 - zoneBand, frame.y0, LW.outer * 0.7, COLORS.rule);
    }
  }
  for (let i = 0; i < rows; i++) {
    const cy = frame.y0 + rh * (i + 0.5);
    const label = letters[i];
    for (const x of [frame.x0 - zoneBand / 2, frame.x1 + zoneBand / 2]) {
      text(page, label, x, cy, {
        font: fonts.regular, size: FS.zone, color: COLORS.rule, align: 'center', middle: true, dropped,
      });
    }
    if (i > 0) {
      const y = frame.y0 + rh * i;
      hline(page, frame.x0 - zoneBand, frame.x0, y, LW.outer * 0.7, COLORS.rule);
      hline(page, frame.x1, frame.x1 + zoneBand, y, LW.outer * 0.7, COLORS.rule);
    }
  }
}

export function drawSheet(page, ctx) {
  const { layout, datum, rows, sheetNo, totalSheets, meta, assets } = ctx;
  const { fonts, dropped } = assets;
  const plot = layout.plot;
  const table = layout.table;
  const n = rows.length;
  // Column width is fixed for the whole set, so a short final sheet keeps the
  // same column pitch instead of stretching its points across the full band.
  const colW = plot.w / Math.max(n, ctx.colsPerSheet || n);
  const xEnd = plot.x0 + colW * n;
  const cx = (i) => plot.x0 + colW * (i + 0.5);
  const toY = (level) =>
    plot.y0 + ((level - datum.datumMin) / datum.range) * plot.h;

  drawFrame(page, layout, fonts, dropped);

  // ── Level grid ───────────────────────────────────────────────────────────
  box(page, plot.x0, plot.y0, plot.w, plot.h, { fill: [1, 1, 1] });

  if (datum.minor) {
    const first = Math.ceil(datum.datumMin / datum.minor) * datum.minor;
    for (let v = first; v <= datum.datumMax + 1e-9; v += datum.minor) {
      if (Math.abs(v / datum.major - Math.round(v / datum.major)) < 1e-9) continue;
      hline(page, plot.x0, plot.x1, toY(v), LW.gridMinor, COLORS.gridMinor);
    }
  }
  const firstMajor = Math.ceil(datum.datumMin / datum.major) * datum.major;
  for (let v = firstMajor; v <= datum.datumMax + 1e-9; v += datum.major) {
    const y = toY(v);
    hline(page, plot.x0, plot.x1, y, LW.gridMajor, COLORS.gridMajor);
    const label = Number.isInteger(datum.major) ? String(Math.round(v)) : v.toFixed(1);
    text(page, label, layout.gutter.labelRight, y, {
      font: fonts.regular, size: FS.yTick, color: COLORS.ink, align: 'right', middle: true, dropped,
    });
  }

  // Per-point rules, carried down through the table so columns read as one grid.
  for (let i = 0; i <= n; i++) {
    vline(page, plot.x0 + colW * i, table.y0, plot.y1, LW.colRule, COLORS.colRule);
  }

  box(page, plot.x0, plot.y0, plot.w, plot.h, { stroke: COLORS.rule, lw: LW.plotBorder });

  // Axis caption, rotated up the left-hand gutter.
  vtext(page, 'LEVEL (m)', layout.gutter.x0 + mm(3.5), plot.y0 + plot.h / 2, {
    font: fonts.bold, size: FS.rowHdr, color: COLORS.ink, dropped,
  });

  // ── Key ──────────────────────────────────────────────────────────────────
  // The table row labels are already colour-coded, but a key in the plot means
  // the profile can be read without looking down at the table.
  {
    const entries = [
      ['GL', COLORS.GL], ['TBL', COLORS.TBL], ['FSL', COLORS.FSL], ['CBL', COLORS.CBL],
    ];
    const w = mm(LEGEND.pad * 2 + LEGEND.entry * entries.length - LEGEND.entry) +
      mm(LEGEND.swatch + LEGEND.gap) + fonts.bold.widthOfTextAtSize('CBL', FS.rowHdr);
    const h = mm(LEGEND.h);
    const lx = plot.x0 + mm(LEGEND.pad);
    const ly = plot.y1 - mm(LEGEND.pad) - h;
    box(page, lx, ly, w, h, { fill: [1, 1, 1], stroke: COLORS.rule, lw: 0.4 });
    entries.forEach(([label, color], i) => {
      const ex = lx + mm(LEGEND.pad + LEGEND.entry * i);
      const ey = ly + h / 2;
      hline(page, ex, ex + mm(LEGEND.swatch), ey, LW.profile * 1.6, color);
      text(page, label, ex + mm(LEGEND.swatch + LEGEND.gap), ey, {
        font: fonts.bold, size: FS.rowHdr, color: COLORS.ink, middle: true, dropped,
      });
    });
  }

  // ── Profile lines ────────────────────────────────────────────────────────
  for (const key of ['tbl', 'fsl', 'cbl', 'gl']) {
    const pts = rows.map((r, i) => ({ x: cx(i), y: toY(r[key]) }));
    polyline(page, pts, LW.profile, COLORS[key.toUpperCase()]);
  }

  // Datum callout — standard on an L-section, and it makes the fixed
  // vertical scale verifiable from the printed sheet.
  text(page, `DATUM  ${datum.datumMin.toFixed(3)} m`, plot.x0 + mm(2), plot.y0 + mm(2.5), {
    font: fonts.bold, size: FS.datum, color: COLORS.ink, dropped,
  });
  text(page, `VERTICAL SCALE  1:${datum.vScale}`, plot.x1 - mm(2), plot.y0 + mm(2.5), {
    font: fonts.bold, size: FS.datum, color: COLORS.ink, align: 'right', dropped,
  });

  // ── Caption ──────────────────────────────────────────────────────────────
  const from = rows[0].ch;
  const to = rows[n - 1].ch;
  text(
    page,
    `L.S. PROFILE OF ${meta.chainage_prefix} CH ${chainageLabel(from)} TO ${chainageLabel(to)}   ` +
    `(${Math.round(from)} m TO ${Math.round(to)} m)`,
    plot.x0 + (xEnd - plot.x0) / 2,
    layout.caption.y0 + layout.caption.h / 2,
    { font: fonts.bold, size: FS.caption, color: COLORS.ink, align: 'center', middle: true, dropped },
  );

  // ── Data table ───────────────────────────────────────────────────────────
  table.rows.forEach((row, ri) => {
    if (ri % 2 === 0) box(page, table.x0, row.y0, xEnd - table.x0, row.h, { fill: COLORS.bandFill });
  });
  for (let i = 0; i <= n; i++) {
    vline(page, plot.x0 + colW * i, table.y0, table.y1, LW.colRule, COLORS.colRule);
  }
  table.rows.forEach((row) => {
    hline(page, table.x0, xEnd, row.y1, LW.tableLight, COLORS.rule);
  });
  hline(page, table.x0, xEnd, table.y0, LW.tableHeavy, COLORS.rule);
  hline(page, table.x0, xEnd, table.y1, LW.tableHeavy, COLORS.rule);
  vline(page, table.x0, table.y0, table.y1, LW.tableHeavy, COLORS.rule);
  vline(page, xEnd, table.y0, table.y1, LW.tableHeavy, COLORS.rule);

  const cellFor = (row, r) => {
    switch (row.key) {
      case 'chKm':
        return chainageLabel(r.ch);
      case 'chM':
        return String(Math.round(r.ch));
      default:
        return r[row.key].toFixed(3);
    }
  };

  table.rows.forEach((row) => {
    const label = row.label.replace('{PREFIX}', meta.chainage_prefix);
    text(page, label, layout.gutter.labelRight, row.y0 + row.h / 2, {
      font: fonts.bold,
      size: FS.rowHdr,
      color: row.color,
      align: 'right',
      middle: true,
      maxWidth: layout.gutter.x1 - layout.gutter.x0 - mm(2),
      dropped,
    });
    const yc = row.y0 + row.h / 2;
    rows.forEach((r, i) => {
      vtext(page, cellFor(row, r), cx(i), yc, {
        font: fonts.regular,
        size: FS.cell,
        color: row.color,
        maxLength: row.h - mm(1.2),
        dropped,
      });
    });
  });

  // ── Title block ──────────────────────────────────────────────────────────
  drawNotes(page, layout, meta, assets);
  drawTitleBlock(page, layout, meta, sheetNo, totalSheets, assets);
}