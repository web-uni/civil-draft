/**
 * index.js — public API for the canal L-section generator.
 *
 * Runs entirely in the browser: no server, no upload, no Python, no timeout.
 * The same module runs unchanged under Node if you ever want a batch endpoint,
 * because nothing in here touches the DOM.
 */

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { buildLayout } from './geometry.js';
import { parseSurvey, chainageLabel } from './parse.js';
import { chooseVerticalScale, buildDatums, paginate } from './scale.js';
import { drawSheet } from './sheet.js';

export { parseSurvey, chainageLabel } from './parse.js';
export { buildLayout } from './geometry.js';
export { chooseVerticalScale, buildDatums, makeDatum, paginate } from './scale.js';

export const DEFAULT_META = {
  title: '',
  scale: '1:1350',
  date: '',
  sheet_size: 'A1',
  chainage_prefix: 'DSBC',
  points_per_sheet: 45,
  datum_mode: 'perSheet', // 'perSheet' | 'global'
  vertical_scale: null, // null = choose automatically, or a denominator like 100
  notes: [
    'ALL DIMENSIONS AND LEVELS ARE IN METRE.',
    'PARAMETERS MAY CHANGE AS PER ACTUAL SITE CONDITION.',
  ],
  drawn_by: '',
  designed_by: '',
  checked_by: '',
  client_name: '',
  contractor_name: '',
  contractor_address: '',
  consultant_name: '',
  consultant_address: '',
  project_text: '',
};

/** PNG and JPEG magic numbers — we embed only what pdf-lib can actually read. */
function imageKind(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  return null;
}

async function embedLogos(pdf, logoBuffers, warnings) {
  const out = {};
  for (const [slot, buf] of Object.entries(logoBuffers || {})) {
    if (!buf) continue;
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const kind = imageKind(bytes);
    if (!kind) {
      warnings.push(`The ${slot} logo is not a PNG or JPEG, so it was left off the drawing.`);
      continue;
    }
    try {
      out[slot] = kind === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    } catch (e) {
      warnings.push(`The ${slot} logo could not be embedded (${e.message}).`);
    }
  }
  return out;
}

/**
 * Inspect a file without rendering — used to show the engineer the sheet count,
 * the chosen scale and any data problems before they commit to generating.
 *
 * @param {ArrayBuffer} buffer
 * @param {object} meta
 */
export function inspectSurvey(buffer, meta = {}) {
  const m = { ...DEFAULT_META, ...meta };
  const parsed = parseSurvey(buffer);
  if (parsed.errors.length || !parsed.rows.length) {
    return { ok: false, ...parsed };
  }
  const layout = buildLayout({ sheetSize: m.sheet_size });
  const sheets = paginate(parsed.rows, m.points_per_sheet);
  const scale = chooseVerticalScale(sheets, layout.plot.availH_mm, m.datum_mode, m.vertical_scale);
  const datums = buildDatums(sheets, layout.plot.availH_mm, scale, m.datum_mode);
  return {
    ok: true,
    ...parsed,
    layout,
    scale,
    datum: datums[0],
    sheetCount: sheets.length,
    span: {
      from: parsed.rows[0].ch,
      to: parsed.rows[parsed.rows.length - 1].ch,
      fromLabel: chainageLabel(parsed.rows[0].ch),
      toLabel: chainageLabel(parsed.rows[parsed.rows.length - 1].ch),
    },
  };
}

/**
 * Generate the full drawing set.
 *
 * @param {ArrayBuffer} buffer survey workbook or CSV
 * @param {object} meta title block fields
 * @param {{client?:ArrayBuffer, contractor?:ArrayBuffer, consultant?:ArrayBuffer}} logos
 * @param {(done:number, total:number)=>void} onProgress
 * @returns {Promise<{ok:boolean, bytes?:Uint8Array, sheetCount?:number, datum?:object,
 *                    errors:string[], warnings:string[]}>}
 */
export async function generateLSectionPdf(buffer, meta = {}, logos = {}, onProgress = null) {
  const m = { ...DEFAULT_META, ...meta };
  const parsed = parseSurvey(buffer);
  const warnings = [...parsed.warnings];
  if (parsed.errors.length || !parsed.rows.length) {
    return { ok: false, errors: parsed.errors, warnings };
  }

  const layout = buildLayout({ sheetSize: m.sheet_size });
  const sheets = paginate(parsed.rows, m.points_per_sheet);
  const scale = chooseVerticalScale(sheets, layout.plot.availH_mm, m.datum_mode, m.vertical_scale);
  const datums = buildDatums(sheets, layout.plot.availH_mm, scale, m.datum_mode);

  const pdf = await PDFDocument.create();
  pdf.setTitle(m.title || 'Canal L-Section');
  pdf.setSubject(
    `L-section ${chainageLabel(parsed.rows[0].ch)} to ` +
      `${chainageLabel(parsed.rows[parsed.rows.length - 1].ch)}, vertical scale 1:${scale.vScale}`,
  );
  pdf.setProducer('Civil Draft');
  pdf.setCreator('Civil Draft');

  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const dropped = new Set();
  const embedded = await embedLogos(pdf, logos, warnings);
  const assets = { fonts, logos: embedded, dropped };
  m._scaleText = `H ${m.scale}   V 1:${scale.vScale}`;

  for (let s = 0; s < sheets.length; s++) {
    const page = pdf.addPage([layout.page.w, layout.page.h]);
    drawSheet(page, {
      layout,
      datum: datums[s],
      rows: sheets[s],
      colsPerSheet: m.points_per_sheet,
      sheetNo: s + 1,
      totalSheets: sheets.length,
      meta: m,
      assets,
    });
    if (onProgress) onProgress(s + 1, sheets.length);
    // Yield so the progress bar actually paints on long runs.
    if (s % 4 === 3) await new Promise((r) => setTimeout(r, 0));
  }

  if (dropped.size) {
    warnings.push(
      `These characters are not in the drawing font and were replaced with spaces: ` +
        `${[...dropped].slice(0, 10).join(' ')}`,
    );
  }
  const clipped = datums.filter((d) => !d.fits).length;
  if (clipped) {
    warnings.push(
      `${clipped} sheet${clipped === 1 ? '' : 's'} could not fit the level range at 1:${scale.vScale}. ` +
        `Reduce points per sheet, or set the vertical scale manually.`,
    );
  }

  const bytes = await pdf.save({ useObjectStreams: true });
  return { ok: true, bytes, sheetCount: sheets.length, scale, datums, errors: [], warnings };
}
