/**
 * draw.js — thin, honest wrappers over pdf-lib.
 *
 * Every mark on the sheet goes through one of these. Keeping them small means
 * the sheet code reads like a drafting instruction ("rule this line, box this
 * cell") rather than a graphics API.
 */

import { rgb, degrees } from 'pdf-lib';

export const c = (arr) => rgb(arr[0], arr[1], arr[2]);

/**
 * The standard PDF fonts use WinAnsi encoding. A firm in Ahmedabad may well
 * paste in a rupee sign or a Gujarati name; pdf-lib throws on characters it
 * cannot encode, which would fail the whole export. Replace what we can,
 * report what we cannot, and never crash.
 */
const SUBSTITUTIONS = {
  '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
  '\u2013': '-', '\u2014': '-', '\u2026': '...', '\u00A0': ' ',
  '\u20B9': 'Rs.', '\u2122': 'TM', '\u2022': '-',
};

export function sanitize(input, dropped) {
  if (input === null || input === undefined) return '';
  let s = String(input);
  for (const [from, to] of Object.entries(SUBSTITUTIONS)) s = s.split(from).join(to);
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (ch === '\n' || (code >= 0x20 && code <= 0xff)) out += ch;
    else {
      out += ' ';
      if (dropped) dropped.add(ch);
    }
  }
  return out;
}

export function hline(page, x0, x1, y, w, color) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: w, color: c(color) });
}

export function vline(page, x, y0, y1, w, color) {
  page.drawLine({ start: { x, y: y0 }, end: { x, y: y1 }, thickness: w, color: c(color) });
}

export function box(page, x, y, w, h, { fill = null, stroke = null, lw = 0.5 } = {}) {
  const opts = { x, y, width: w, height: h };
  if (fill) opts.color = c(fill);
  if (stroke) {
    opts.borderColor = c(stroke);
    opts.borderWidth = lw;
  }
  page.drawRectangle(opts);
}

/** Polyline through [{x,y}, ...]. */
export function polyline(page, pts, w, color) {
  const col = c(color);
  for (let i = 1; i < pts.length; i++) {
    page.drawLine({ start: pts[i - 1], end: pts[i], thickness: w, color: col, lineCap: 0 });
  }
}

/**
 * Horizontal text. `y` is the BASELINE unless `middle` is true, in which case
 * `y` is the vertical centre of the glyph body — which is what you want when
 * centring text in a table cell.
 */
export function text(page, str, x, y, opts = {}) {
  const {
    font,
    size = 6,
    color = [0, 0, 0],
    align = 'left',
    middle = false,
    maxWidth = null,
    dropped = null,
  } = opts;
  let s = sanitize(str, dropped);
  if (!s) return;
  if (maxWidth) s = ellipsize(s, font, size, maxWidth);

  const w = font.widthOfTextAtSize(s, size);
  let tx = x;
  if (align === 'center') tx = x - w / 2;
  else if (align === 'right') tx = x - w;

  const ty = middle ? y - size * 0.36 : y;
  page.drawText(s, { x: tx, y: ty, size, font, color: c(color) });
}

/**
 * Text rotated 90° anticlockwise, reading bottom-to-top, centred on (cx, cy).
 *
 * With rotate(90) the advance direction becomes +y and the glyph's "up"
 * direction becomes -x, so the drawn band sits between (x - ascent) and
 * (x + descent). Offsetting x by ~0.36·size puts that band on the cell centre.
 */
export function vtext(page, str, cx, cy, opts = {}) {
  const { font, size = 5.6, color = [0, 0, 0], maxLength = null, dropped = null } = opts;
  let s = sanitize(str, dropped);
  if (!s) return;
  if (maxLength) s = ellipsize(s, font, size, maxLength);
  const w = font.widthOfTextAtSize(s, size);
  page.drawText(s, {
    x: cx + size * 0.36,
    y: cy - w / 2,
    size,
    font,
    color: c(color),
    rotate: degrees(90),
  });
}

export function ellipsize(s, font, size, maxWidth) {
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(s.slice(0, mid) + '..', size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo).trimEnd() + '..';
}

/** Word-wrap, honouring any newlines already in the string. */
export function wrap(str, font, size, maxWidth, dropped = null) {
  const src = sanitize(str, dropped);
  if (!src) return [];
  const out = [];
  for (const para of src.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth || !line) line = trial;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * Draw wrapped text into a box, top-down from `yTop`.
 * Returns the y of the last baseline drawn.
 */
export function paragraph(page, str, x, yTop, opts = {}) {
  const {
    font,
    size = 6,
    color = [0, 0, 0],
    maxWidth,
    leading = size * 1.28,
    maxLines = 99,
    align = 'left',
    dropped = null,
  } = opts;
  const lines = wrap(str, font, size, maxWidth, dropped).slice(0, maxLines);
  let y = yTop - size;
  for (const ln of lines) {
    text(page, ln, x, y, { font, size, color, align, dropped });
    y -= leading;
  }
  return y + leading;
}

/** Height a paragraph will occupy, for vertical centring. */
export function paragraphHeight(str, font, size, maxWidth, leading = size * 1.28, maxLines = 99) {
  const n = Math.min(wrap(str, font, size, maxWidth).length, maxLines);
  return n === 0 ? 0 : size + (n - 1) * leading;
}
