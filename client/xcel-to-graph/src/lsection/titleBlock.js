/**
 * titleBlock.js — the drawing's title block.
 *
 * Bands run top to bottom and their heights sum exactly to the frame height,
 * so there is never dead space at the bottom. Order follows the reference
 * sheet, with the revision table moved down to sit directly above the bottom
 * strip. Revisions and the drawing number are drawn as blank ruled cells to be
 * filled in on issue — they are no longer form inputs.
 */

import { COLORS, FS, STRIP_W, STRIP_CELLS, REV_COLS, mm } from './geometry.js';
import { box, hline, vline, text, paragraph, paragraphHeight, wrap } from './draw.js';

const PAD = mm(2);
const RULE = 0.6;
const RULE_OUTER = 1.0;

function bandBox(page, tb, band) {
  box(page, tb.x0, band.y0, tb.w, band.h, { stroke: COLORS.rule, lw: RULE });
}

function sectionHeader(page, label, x, yTop, fonts, dropped) {
  text(page, label, x, yTop - FS.tbHead, {
    font: fonts.bold,
    size: FS.tbHead,
    color: COLORS.ink,
    dropped,
  });
  return yTop - FS.tbHead - mm(1.6);
}

/**
 * A logo + name (+ address) cell, used for client, contractor and consultant.
 * `x0`/`x1` let two of these sit side by side inside one band.
 */
function entityBand(page, band, x0, x1, opts) {
  const { header, logo, name, address, fonts, dropped, nameBold = true } = opts;
  const w = x1 - x0;

  let bodyTop = band.y1;
  if (header) {
    const hh = FS.tbHead + mm(2.8);
    hline(page, x0, x1, band.y1 - hh, RULE * 0.7, COLORS.rule);
    text(page, header, x0 + PAD, band.y1 - hh + mm(1.3), {
      font: fonts.bold,
      size: FS.tbHead,
      color: COLORS.ink,
      dropped,
    });
    bodyTop = band.y1 - hh;
  }

  const bodyH = bodyTop - band.y0;
  let textX = x0 + PAD;
  let textW = w - 2 * PAD;

  if (logo) {
    const maxW = Math.min(mm(34), w * 0.34);
    const maxH = Math.min(bodyH - mm(4), mm(34));
    const sc = logo.scaleToFit(maxW, maxH);
    page.drawImage(logo, {
      x: x0 + PAD,
      y: band.y0 + (bodyH - sc.height) / 2,
      width: sc.width,
      height: sc.height,
    });
    textX = x0 + PAD + sc.width + mm(3);
    textW = x1 - PAD - textX;
  }

  const nameFont = nameBold ? fonts.bold : fonts.regular;
  const nameH = name ? paragraphHeight(name, nameFont, FS.tbBody, textW, FS.tbBody * 1.3, 4) : 0;
  const addrH = address
    ? paragraphHeight(address, fonts.regular, FS.tbSmall, textW, FS.tbSmall * 1.3, 6)
    : 0;
  const gap = name && address ? mm(1.8) : 0;
  const total = nameH + gap + addrH;

  let y = band.y0 + (bodyH + total) / 2;
  if (name) {
    y = paragraph(page, name, textX, y, {
      font: nameFont,
      size: FS.tbBody,
      color: COLORS.ink,
      maxWidth: textW,
      leading: FS.tbBody * 1.3,
      maxLines: 4,
      dropped,
    });
    y -= gap + FS.tbSmall * 0.4;
  }
  if (address) {
    paragraph(page, address, textX, y, {
      font: fonts.regular,
      size: FS.tbSmall,
      color: COLORS.inkMid,
      maxWidth: textW,
      leading: FS.tbSmall * 1.3,
      maxLines: 6,
      dropped,
    });
  }
}

/**
 * NOTE text, top right, unboxed — the reference sets it loose above the title
 * block rather than as another ruled band inside it.
 */
export function drawNotes(page, layout, meta, assets) {
  const nb = layout.noteBlock;
  const { fonts, dropped } = assets;
  const notes = (meta.notes || []).filter((n) => String(n).trim());
  if (!notes.length) return;

  const y0 = nb.y1 - FS.tbHead;
  text(page, 'NOTE:-', nb.x0, y0, { font: fonts.bold, size: FS.tbHead, color: COLORS.ink, dropped });
  const w = fonts.bold.widthOfTextAtSize('NOTE:-', FS.tbHead);
  hline(page, nb.x0, nb.x0 + w, y0 - mm(0.8), 0.5, COLORS.ink);

  const numW = mm(6);
  let y = y0 - mm(3.4);
  notes.forEach((n, i) => {
    if (y < nb.y0) return;
    text(page, `${i + 1}.`, nb.x0, y - FS.tbBody, {
      font: fonts.regular, size: FS.tbBody, color: COLORS.ink, dropped,
    });
    y = paragraph(page, n, nb.x0 + numW, y, {
      font: fonts.regular,
      size: FS.tbBody,
      color: COLORS.ink,
      maxWidth: nb.w - numW,
      leading: FS.tbBody * 1.35,
      maxLines: 3,
      dropped,
    });
    y -= mm(1.6);
  });
}

export function drawTitleBlock(page, layout, meta, sheetNo, totalSheets, assets) {
  const tb = layout.titleBlock;
  const b = tb.bands;
  const { fonts, logos = {}, dropped } = assets;

  // Outer edge of the block, drawn last-but-first so band rules sit inside it.
  box(page, tb.x0, tb.y0, tb.w, tb.h, { stroke: COLORS.rule, lw: RULE_OUTER });

  // ── REVISION TABLE (ruled blank, filled in on issue) ─────────────────────
  {
    const band = b.revisions;
    bandBox(page, tb, band);
    const headH = Math.min(mm(7), band.h * 0.2);
    const nRows = 4;
    const rh = (band.h - headH) / nRows;
    const totalW = REV_COLS.reduce((s, col) => s + col.w, 0);

    box(page, tb.x0, band.y1 - headH, tb.w, headH, { fill: COLORS.headFill });
    hline(page, tb.x0, tb.x1, band.y1 - headH, RULE * 0.7, COLORS.rule);

    let x = tb.x0;
    for (const col of REV_COLS) {
      const w = (col.w / totalW) * tb.w;
      if (x > tb.x0) vline(page, x, band.y0, band.y1, RULE * 0.7, COLORS.rule);
      text(page, col.label, x + mm(1.5), band.y1 - headH / 2, {
        font: fonts.bold,
        size: FS.tbSmall,
        color: COLORS.ink,
        middle: true,
        maxWidth: w - mm(3),
        dropped,
      });
      x += w;
    }
    for (let i = 1; i <= nRows; i++) {
      const y = band.y1 - headH - rh * i;
      if (i < nRows) hline(page, tb.x0, tb.x1, y, RULE * 0.5, COLORS.rule);
    }
  }

  // ── DRAWN / DESIGNED / CHECKED ───────────────────────────────────────────
  {
    const band = b.staff;
    bandBox(page, tb, band);
    const rows = [
      ['DRAWN BY :-', meta.drawn_by],
      ['DESIGNED BY :-', meta.designed_by],
      ['CHECKED BY :-', meta.checked_by],
    ];
    const rh = band.h / rows.length;
    const splitX = tb.x0 + tb.w * 0.42;
    rows.forEach(([label, value], i) => {
      const y0 = band.y1 - rh * (i + 1);
      if (i > 0) hline(page, tb.x0, tb.x1, band.y1 - rh * i, RULE * 0.7, COLORS.rule);
      vline(page, splitX, y0, y0 + rh, RULE * 0.7, COLORS.rule);
      text(page, label, tb.x0 + PAD, y0 + rh / 2, {
        font: fonts.bold,
        size: FS.tbSmall,
        color: COLORS.ink,
        middle: true,
        dropped,
      });
      text(page, value, splitX + PAD, y0 + rh / 2, {
        font: fonts.regular,
        size: FS.tbBody,
        color: COLORS.ink,
        middle: true,
        maxWidth: tb.x1 - PAD - splitX - PAD,
        dropped,
      });
    });
  }

  // ── CLIENT | CONTRACTOR, side by side as on the reference ────────────────
  {
    const band = b.parties;
    bandBox(page, tb, band);
    const mid = tb.x0 + tb.w / 2;
    vline(page, mid, band.y0, band.y1, RULE * 0.7, COLORS.rule);
    entityBand(page, band, tb.x0, mid, {
      header: 'CLIENT:-',
      logo: logos.client,
      name: meta.client_name,
      fonts,
      dropped,
    });
    entityBand(page, band, mid, tb.x1, {
      header: 'CONTRACTOR:-',
      logo: logos.contractor,
      name: meta.contractor_name,
      address: meta.contractor_address,
      fonts,
      dropped,
    });
  }

  // ── CONSULTANT (no header, matching the reference) ───────────────────────
  {
    const band = b.consultant;
    bandBox(page, tb, band);
    entityBand(page, band, tb.x0, tb.x1, {
      header: null,
      logo: logos.consultant,
      name: meta.consultant_name,
      address: meta.consultant_address,
      fonts,
      dropped,
    });
  }

  // ── PROJECT ──────────────────────────────────────────────────────────────
  {
    const band = b.project;
    bandBox(page, tb, band);
    const y = sectionHeader(page, 'PROJECT:-', tb.x0 + PAD, band.y1 - mm(1.5), fonts, dropped);
    paragraph(page, meta.project_text, tb.x0 + PAD, y, {
      font: fonts.regular,
      size: FS.tbBody,
      color: COLORS.ink,
      maxWidth: tb.w - 2 * PAD,
      leading: FS.tbBody * 1.35,
      maxLines: 12,
      dropped,
    });
  }

  // ── TITLE + sheet number ─────────────────────────────────────────────────
  {
    const band = b.title;
    bandBox(page, tb, band);
    sectionHeader(page, 'TITLE :-', tb.x0 + PAD, band.y1 - mm(1.5), fonts, dropped);
    const cx = tb.x0 + tb.w / 2;
    const lines = wrap(meta.title, fonts.bold, FS.tbTitle, tb.w - 2 * PAD, dropped).slice(0, 3);
    const lead = FS.tbTitle * 1.32;
    const gap = mm(5);
    const blockH = (lines.length ? FS.tbTitle + (lines.length - 1) * lead : 0) + gap + FS.tbBody;
    // Centre the title and its sheet number together in the space below the header.
    const top = band.y0 + (band.h - mm(7) - blockH) / 2 + blockH;
    let y = top - FS.tbTitle;
    for (const ln of lines) {
      text(page, ln, cx, y, { font: fonts.bold, size: FS.tbTitle, color: COLORS.ink, align: 'center', dropped });
      y -= lead;
    }
    text(
      page,
      `(SHEET ${String(sheetNo).padStart(2, '0')} OF ${String(totalSheets).padStart(2, '0')})`,
      cx,
      y + lead - FS.tbTitle - gap - FS.tbBody + FS.tbTitle,
      { font: fonts.regular, size: FS.tbBody, color: COLORS.ink, align: 'center', dropped },
    );
  }

  // ── BOTTOM STRIP: 3 columns over 2 rows ──────────────────────────────────
  {
    const band = b.strip;
    bandBox(page, tb, band);
    const totalW = STRIP_W.reduce((a, w) => a + w, 0);
    const xs = [tb.x0];
    for (const w of STRIP_W) xs.push(xs[xs.length - 1] + (w / totalW) * tb.w);
    const rowH = band.h / 2;
    const values = {
      dwgNo: '', // filled in on issue
      scale: meta._scaleText || meta.scale,
      rev: '',
      date: meta.date,
    };

    // Column rules run the full height; the row rule skips the merged column.
    vline(page, xs[1], band.y0, band.y1, RULE * 0.7, COLORS.rule);
    vline(page, xs[2], band.y0, band.y1, RULE * 0.7, COLORS.rule);
    hline(page, xs[1], tb.x1, band.y0 + rowH, RULE * 0.7, COLORS.rule);

    // Merged first column: SHEET SIZE over its value.
    text(page, 'SHEET', xs[0] + mm(1.5), band.y1 - mm(1.6) - FS.tbSmall, {
      font: fonts.bold, size: FS.tbSmall, color: COLORS.ink, dropped,
    });
    text(page, 'SIZE', xs[0] + mm(1.5), band.y1 - mm(1.6) - FS.tbSmall * 2.15, {
      font: fonts.bold, size: FS.tbSmall, color: COLORS.ink, dropped,
    });
    text(page, layout.sheetSize, xs[0] + (xs[1] - xs[0]) / 2, band.y0 + rowH * 0.5, {
      font: fonts.regular, size: FS.tbBody, color: COLORS.ink, align: 'center', middle: true, dropped,
    });

    // Label and value share a line, as on the reference.
    for (const cell of STRIP_CELLS) {
      const cx0 = xs[cell.col];
      const cx1 = xs[cell.col + 1];
      const cy = band.y1 - rowH * (cell.row + 0.5);
      const lw = fonts.bold.widthOfTextAtSize(cell.label, FS.tbSmall);
      text(page, cell.label, cx0 + mm(1.5), cy, {
        font: fonts.bold, size: FS.tbSmall, color: COLORS.ink, middle: true, dropped,
      });
      text(page, values[cell.key], cx0 + mm(1.5) + lw + mm(2), cy, {
        font: fonts.regular, size: FS.tbBody, color: COLORS.ink, middle: true,
        maxWidth: cx1 - cx0 - lw - mm(5), dropped,
      });
    }
  }
}