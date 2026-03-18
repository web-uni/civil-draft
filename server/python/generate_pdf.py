"""
Canal Longitudinal Section PDF Generator  v8  (memory-optimised)
- Graph occupies left 68% of page, formal title block on right 32%
- Title block matches reference drawing exactly
- All user-editable fields in DRAWING_INFO dict at top of file
- Windows-safe ASCII in all print() calls

MEMORY FIXES vs v7:
  1. matplotlib.use('Agg') set at very top before ANY other matplotlib import
  2. plt.close(fig) called after EVERY page render (was already present, now explicit)
  3. gc.collect() called after each page to force CPython to release figure memory
  4. DPI lowered from 220 → 150 (PNG RAM usage scales with DPI²; saves ~50% RAM)
  5. Intermediate PNGs written to disk and immediately freed from Python scope
  6. reportlab Canvas streams pages one-by-one instead of holding all ImageReaders
  7. DataFrame sliced with .copy() to avoid holding reference to full df in batch loop
  8. del + gc.collect() used after each batch slice is done rendering
"""
import sys, os, math, warnings, textwrap, gc
warnings.filterwarnings('ignore')

# ── CRITICAL: backend must be set before pyplot is imported ───────
import matplotlib
matplotlib.use('Agg')   # non-interactive, no GUI, no X11 needed

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker as mticker
from matplotlib.gridspec import GridSpec, GridSpecFromSubplotSpec
from matplotlib.patches import Rectangle

import pandas as pd

try:
    from reportlab.lib.pagesizes import A3, landscape
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.utils import ImageReader
    from reportlab.lib.units import mm
    REPORTLAB = True
except ImportError:
    REPORTLAB = False
    print("WARNING: reportlab not installed")

# ═══════════════════════════════════════════════════════════════════
#  USER CONFIGURATION  –  edit everything in this block
# ═══════════════════════════════════════════════════════════════════
DRAWING_INFO = {
    # ── Notes (shown in NOTE:- section) ────────────────────────────
    "notes": [
        "ALL DIMENSION AND LEVELS ARE IN METRE.",
        "PARAMETERS MAY CHANGE AS PER ACTUAL SITE CONDITION.",
    ],

    # ── Revision table rows (leave empty list for blank table) ──────
    "revisions": [
        {"rev": "P0", "date": "18-10-2024",
         "description": "Issued for Review", "remarks": ""},
    ],

    # ── Drawn / Designed / Checked ──────────────────────────────────
    "drawn_by":    "SP",
    "designed_by": "AS",
    "checked_by":  "PNR",

    # ── Client ──────────────────────────────────────────────────────
    "client_name":    "Sardar Sarovar Narmada\nNigam Limited, Gujrat",
    "client_logo":    "",

    # ── Contractor ──────────────────────────────────────────────────
    "contractor_name":    "CONTRACTOR:-",
    "contractor_address": "Iskcon Temple, B Wing, 15th Floor,\nPrivilon Building, Vikram Nagar,\nAmbli - Bopal Rd, B\\H, Ahmedabad,\nGujarat 380058",
    "contractor_logo":    "",

    # ── Consultant ──────────────────────────────────────────────────
    "consultant_name":    "Hindustan Consulting Associates Pvt. Ltd.",
    "consultant_address": "405, 4th Floor, Surya Kiran Building,\n19 KG Marg, New Delhi 110001",
    "consultant_logo":    "",

    # ── Project ─────────────────────────────────────────────────────
    "project_text": (
        "EPC contract for construction of constructing Dudhai sub-branch "
        "canal reach from CH. 23.025 km to 68.522 km (Earthwork, Structures, "
        "Lining, Service Road, C.R./H.R./Escape Gates, Stop Logs, Control Cabins, "
        "etc.) including Geo-tech Investigation, Design of Structures and Operation "
        "and Maintenance of the same for 5 (five) years."
    ),

    # ── Title ───────────────────────────────────────────────────────
    "title":       "L- SECTION OF DUDHAI SUB BRANCH CANAL",

    # ── Sheet info ──────────────────────────────────────────────────
    "sheet_size":  "A1",
    "dwg_no":      "HCA-1179-CL-LS-DWG-01",
    "scale":       "1:1350",
    "date":        "18-10-2024",
}
# ═══════════════════════════════════════════════════════════════════

# ── Layout constants ──────────────────────────────────────────────
GRAPH_FRAC   = 0.68
TB_FRAC      = 0.32
TITLE_H      = 0.055
FOOTER_H     = 0.000
BODY_H       = 1.0 - TITLE_H
PLOT_RATIO   = 3.8
TABLE_RATIO  = 1.4
TOTAL_RATIO  = PLOT_RATIO + TABLE_RATIO
TABLE_H_FRAC = BODY_H * TABLE_RATIO / TOTAL_RATIO

LEFT_YAXIS   = 0.025
LEFT_HDR     = 0.065
DATA_LEFT    = LEFT_YAXIS + LEFT_HDR
DATA_RIGHT   = 1.0 - GRAPH_FRAC + 0.004
BOT          = 0.008

N_TABLE_ROWS = 6
_ROW_H = TABLE_H_FRAC / N_TABLE_ROWS
ROW_Y  = [FOOTER_H + BOT + (ri + 0.5) * _ROW_H for ri in range(N_TABLE_ROWS)]

# ── Config ────────────────────────────────────────────────────────
BATCH_SIZE   = 30
DPI          = 150      # MEMORY FIX: was 220. PNG RAM ~ DPI². 150 saves ~50% RAM.
FIG_W        = 20.0
FIG_H        = 11.0

FS_CELL      = 5.5
FS_ROW_HDR   = 6.0
FS_YLABEL    = 8.0
FS_YTICK     = 7.0
FS_TITLE     = 9.5
FS_LEGEND    = 7.0
FS_TB        = 6.5
FS_TB_HEAD   = 7.0

C = {
    'GL':  '#CC0000',
    'TBL': '#0050A0',
    'FSL': '#007000',
    'CBL': '#007B8A',
}

TABLE_ROWS = [
    ('GL',       'GL',                C['GL']),
    ('TBL',      'TBL',               C['TBL']),
    ('FSL',      'FSL',               C['FSL']),
    ('CBL',      'CBL',               C['CBL']),
    ('CH_label', 'Chainage (m)',       '#111111'),
    ('CH_abs',   'DSBC CHAINAGE (m)', '#333333'),
]

# ── Helpers ───────────────────────────────────────────────────────
def ch_label(metres):
    km, m = divmod(int(round(float(metres))), 1000)
    return "%d+%03d" % (km, m)

def to_metres(s):
    s = s.astype(float)
    return (s * 1000).round() if s.max() < 1000 else s.round()

def nice_y(vmin, vmax):
    lo = math.floor(vmin) - 2
    hi = math.ceil(vmax)  + 4
    return lo, hi

def tb_rect(ax, x, y, w, h, fc='white', ec='#555555', lw=0.6):
    ax.add_patch(Rectangle((x, y), w, h,
                            transform=ax.transAxes,
                            facecolor=fc, edgecolor=ec,
                            linewidth=lw, clip_on=False, zorder=5))

def tb_text(ax, x, y, txt, fs=FS_TB, color='#111', ha='left', va='top',
            bold=False, wrap_width=None, italic=False):
    if wrap_width and len(txt) > wrap_width:
        txt = '\n'.join(textwrap.wrap(txt, wrap_width))
    ax.text(x, y, txt,
            transform=ax.transAxes,
            fontsize=fs, color=color,
            ha=ha, va=va,
            fontweight='bold' if bold else 'normal',
            fontstyle='italic' if italic else 'normal',
            clip_on=False, zorder=6,
            fontfamily='DejaVu Sans')

# ── Title block renderer ──────────────────────────────────────────
def draw_title_block(ax_tb, page_no, total_pages, info):
    ax_tb.set_xlim(0, 1)
    ax_tb.set_ylim(0, 1)
    ax_tb.axis('off')
    ax_tb.set_facecolor('white')

    tb_rect(ax_tb, 0, 0, 1, 1, fc='white', ec='#333', lw=1.2)

    sec = {
        'note':       0.115,
        'rev_table':  0.130,
        'drawn':      0.060,
        'client':     0.120,
        'consultant': 0.080,
        'project':    0.135,
        'title':      0.080,
        'bottom':     0.045,
    }
    y_cur = 1.0
    y_sec = {}
    for k, h in sec.items():
        y_sec[k] = (y_cur - h, y_cur, h)
        y_cur -= h

    pad  = 0.02
    tpad = 0.012

    # NOTE section
    yb, yt, h = y_sec['note']
    tb_rect(ax_tb, 0, yb, 1, h)
    tb_text(ax_tb, pad, yt - tpad, "NOTE:-", fs=FS_TB_HEAD, bold=True)
    for i, note in enumerate(info.get('notes', [])):
        tb_text(ax_tb, pad, yt - tpad - 0.022 - i*0.025,
                "%d.  %s" % (i+1, note), fs=FS_TB - 0.5, wrap_width=38)

    # Revision table
    yb, yt, h = y_sec['rev_table']
    tb_rect(ax_tb, 0, yb, 1, h)
    cw = [0.08, 0.15, 0.50, 0.27]
    cx = [0.0, 0.08, 0.23, 0.73]
    cheads = ['REV.', 'DATE', 'DESCRIPTION', 'REMARKS']
    row_h = h / (len(info.get('revisions', [])) + 1)
    for ci, (cxv, cwv, ch) in enumerate(zip(cx, cw, cheads)):
        tb_rect(ax_tb, cxv, yt - row_h, cwv, row_h, fc='#E8EDF2')
        tb_text(ax_tb, cxv + 0.01, yt - row_h + row_h*0.65, ch,
                fs=FS_TB - 1.0, bold=True, ha='left')
    for ri, rev in enumerate(info.get('revisions', [])):
        ry = yt - row_h * (ri + 2)
        vals = [rev.get('rev',''), rev.get('date',''),
                rev.get('description',''), rev.get('remarks','')]
        for ci, (cxv, cwv, val) in enumerate(zip(cx, cw, vals)):
            tb_rect(ax_tb, cxv, ry, cwv, row_h)
            tb_text(ax_tb, cxv + 0.01, ry + row_h*0.65, val, fs=FS_TB - 1.5)

    # Drawn / Designed / Checked
    yb, yt, h = y_sec['drawn']
    tb_rect(ax_tb, 0, yb, 1, h)
    rows_ddc = [
        ("DRAWN BY :-",    info.get('drawn_by', '')),
        ("DESIGNED BY:-",  info.get('designed_by', '')),
        ("CHECKED BY:-",   info.get('checked_by', '')),
    ]
    rh = h / 3.0
    for ri, (lbl, val) in enumerate(rows_ddc):
        ry = yt - rh * (ri + 1)
        tb_rect(ax_tb, 0, ry, 0.45, rh)
        tb_rect(ax_tb, 0.45, ry, 0.55, rh)
        tb_text(ax_tb, pad, ry + rh*0.65, lbl, fs=FS_TB - 1.0, bold=True)
        tb_text(ax_tb, 0.47, ry + rh*0.65, val, fs=FS_TB - 0.5)

    # CLIENT + CONTRACTOR
    yb, yt, h = y_sec['client']
    tb_rect(ax_tb, 0, yb, 1, h)
    tb_rect(ax_tb, 0, yb, 0.50, h)
    tb_text(ax_tb, pad, yt - tpad, "CLIENT:-", fs=FS_TB_HEAD, bold=True)
    if info.get('client_logo') and os.path.exists(info.get('client_logo', '')):
        try:
            logo = plt.imread(info.get('client_logo', ''))
            ax_inset = ax_tb.inset_axes([0.02, yb + 0.01, 0.12, h*0.55],
                                        transform=ax_tb.transAxes)
            ax_inset.imshow(logo)
            ax_inset.axis('off')
            tb_text(ax_tb, 0.16, yb + h*0.45,
                    info.get('client_name', ''), fs=FS_TB - 0.5, va='center')
        except Exception:
            tb_text(ax_tb, pad, yb + h*0.45,
                    info.get('client_name', ''), fs=FS_TB - 0.5, va='center')
    else:
        tb_text(ax_tb, pad, yb + h*0.45,
                info.get('client_name', ''), fs=FS_TB - 0.5, va='center')

    tb_rect(ax_tb, 0.50, yb, 0.50, h)
    tb_text(ax_tb, 0.52, yt - tpad, "CONTRACTOR:-", fs=FS_TB_HEAD, bold=True)
    if info.get('contractor_logo') and os.path.exists(info.get('contractor_logo', '')):
        try:
            logo = plt.imread(info.get('contractor_logo', ''))
            ax_inset2 = ax_tb.inset_axes([0.52, yb + 0.01, 0.10, h*0.5],
                                          transform=ax_tb.transAxes)
            ax_inset2.imshow(logo)
            ax_inset2.axis('off')
            tb_text(ax_tb, 0.64, yb + h*0.40,
                    info.get('contractor_address', ''), fs=FS_TB - 1.5, va='center')
        except Exception:
            tb_text(ax_tb, 0.52, yb + h*0.40,
                    info.get('contractor_address', ''), fs=FS_TB - 1.5, va='center')
    else:
        tb_text(ax_tb, 0.52, yb + h*0.40,
                info.get('contractor_address', ''), fs=FS_TB - 1.5, va='center')

    # CONSULTANT
    yb, yt, h = y_sec['consultant']
    tb_rect(ax_tb, 0, yb, 1, h)
    if info.get('consultant_logo') and os.path.exists(info.get('consultant_logo', '')):
        try:
            logo = plt.imread(info.get('consultant_logo', ''))
            ax_inset3 = ax_tb.inset_axes([0.02, yb + 0.005, 0.12, h*0.75],
                                           transform=ax_tb.transAxes)
            ax_inset3.imshow(logo)
            ax_inset3.axis('off')
            tb_text(ax_tb, 0.17, yb + h*0.65,
                    info.get('consultant_name', ''), fs=FS_TB, bold=True, va='center')
            tb_text(ax_tb, 0.17, yb + h*0.30,
                    info.get('consultant_address', ''), fs=FS_TB - 1.0, va='center')
        except Exception:
            tb_text(ax_tb, pad, yb + h*0.65,
                    info.get('consultant_name', ''), fs=FS_TB, bold=True, va='center')
            tb_text(ax_tb, pad, yb + h*0.25,
                    info.get('consultant_address', ''), fs=FS_TB - 1.0, va='center')
    else:
        tb_text(ax_tb, pad, yb + h*0.65,
                info.get('consultant_name', ''), fs=FS_TB, bold=True, va='center')
        tb_text(ax_tb, pad, yb + h*0.25,
                info.get('consultant_address', ''), fs=FS_TB - 1.0, va='center')

    # PROJECT
    yb, yt, h = y_sec['project']
    tb_rect(ax_tb, 0, yb, 1, h)
    tb_text(ax_tb, pad, yt - tpad, "PROJECT:-", fs=FS_TB_HEAD, bold=True)
    tb_text(ax_tb, pad, yt - tpad - 0.026,
            info.get('project_text', ''), fs=FS_TB - 1.0, va='top', wrap_width=48)

    # TITLE
    yb, yt, h = y_sec['title']
    tb_rect(ax_tb, 0, yb, 1, h)
    tb_text(ax_tb, pad, yt - tpad, "TITLE :-", fs=FS_TB_HEAD, bold=True)
    tb_text(ax_tb, 0.5, yb + h*0.45,
            info.get('title', ''), fs=FS_TB + 1.0, bold=True,
            ha='center', va='center')
    tb_text(ax_tb, 0.5, yb + h*0.12,
            "(SHEET %02d OF %02d)" % (page_no, total_pages),
            fs=FS_TB, ha='center', va='bottom')

    # BOTTOM STRIP
    yb, yt, h = y_sec['bottom']
    tb_rect(ax_tb, 0, yb, 1, h)
    ch_s = info.get('_global_ch_start', '')
    ch_e = info.get('_global_ch_end', '')
    scale_val = info.get('scale', '')
    if ch_s and ch_e and scale_val:
        scale_label = "SCALE: %s  CH %s TO %s" % (scale_val, ch_s, ch_e)
    elif scale_val:
        scale_label = "SCALE: %s" % scale_val
    else:
        scale_label = ''
    col_x = [0.00, 0.14, 0.50, 0.68, 0.82]
    col_w = [0.14, 0.36, 0.18, 0.14, 0.18]
    col_top_labels = ['SHEET\nSIZE', 'DWG. NO.', '', 'REV.', 'DATE']
    col_bot_vals   = [
        info.get('sheet_size', ''),
        info.get('dwg_no', ''),
        scale_label,
        '',
        info.get('date', ''),
    ]
    for cxi, cwi, top_lbl, bot_val in zip(col_x, col_w, col_top_labels, col_bot_vals):
        tb_rect(ax_tb, cxi, yb, cwi, h)
        if top_lbl:
            tb_text(ax_tb, cxi + 0.01, yb + h*0.92,
                    top_lbl, fs=FS_TB - 1.5, bold=True, va='top')
        if bot_val:
            tb_text(ax_tb, cxi + 0.01, yb + h*0.38,
                    bot_val, fs=FS_TB - 1.0, va='center')


# ── Page render ───────────────────────────────────────────────────
def render_page(dfb, page_no, total_pages, out_png, info=None):
    """
    Render one page to a PNG file.
    MEMORY: figure is explicitly closed and gc.collect() is called before return.
    """
    if info is None:
        info = DRAWING_INFO

    needed = ['CH', 'GL', 'CBL', 'FSL', 'TBL']
    dfb = dfb.dropna(subset=needed).copy()
    dfb['CH_m'] = to_metres(dfb['CH'])
    dfb = dfb.sort_values('CH_m').reset_index(drop=True)
    n = len(dfb)
    if n == 0:
        return False

    ch_m   = dfb['CH_m'].values.astype(float)
    ch_lbl = [ch_label(v) for v in ch_m]
    ch_abs = [str(int(v)) for v in ch_m]
    cs, ce = ch_label(ch_m[0]), ch_label(ch_m[-1])
    x      = list(range(n))

    fig = None   # guard for finally block
    try:
        # ── Figure ────────────────────────────────────────────────────
        fig = plt.figure(figsize=(FIG_W, FIG_H), facecolor='white', dpi=DPI)

        fig_gs = GridSpec(
            1, 2,
            width_ratios=[GRAPH_FRAC, TB_FRAC],
            wspace=0.0,
            figure=fig,
        )
        graph_gs = GridSpecFromSubplotSpec(
            2, 1,
            subplot_spec=fig_gs[0],
            height_ratios=[TITLE_H, BODY_H],
            hspace=0.0,
        )
        body_gs = GridSpecFromSubplotSpec(
            2, 1,
            subplot_spec=graph_gs[1],
            height_ratios=[PLOT_RATIO, TABLE_RATIO],
            hspace=0.0,
        )

        # Title bar
        ax_hdr = fig.add_subplot(graph_gs[0])
        ax_hdr.set_facecolor('#0D1B5E')
        ax_hdr.axis('off')
        ax_hdr.text(
            0.5, 0.5,
            "L-SECTION OF DUDHAI SUB BRANCH CANAL   |   "
            "CH %s TO %s" % (cs, ce),
            transform=ax_hdr.transAxes,
            ha='center', va='center',
            fontsize=FS_TITLE, fontweight='bold',
            color='white', fontfamily='monospace',
        )

        # Main plot
        ax = fig.add_subplot(body_gs[0])
        ax.set_facecolor('white')

        for col in ['GL', 'TBL', 'FSL', 'CBL']:
            ax.plot(x, dfb[col].values,
                    color=C[col], linewidth=1.6, zorder=4,
                    solid_capstyle='butt', solid_joinstyle='miter')

        all_v = dfb[['GL','TBL','FSL','CBL']].values.flatten()
        ylo, yhi = nice_y(all_v.min(), all_v.max())
        ax.set_ylim(ylo, yhi)
        ax.yaxis.set_major_locator(mticker.MultipleLocator(1))
        ax.yaxis.set_minor_locator(mticker.MultipleLocator(0.5))
        ax.tick_params(axis='y', which='major', labelsize=FS_YTICK,
                       colors='#222', length=4, width=0.6)
        ax.tick_params(axis='y', which='minor', length=2, width=0.4, color='#888')
        ax.set_ylabel('Level (m)', fontsize=FS_YLABEL, color='#333', labelpad=4)
        ax.set_xlim(-0.5, n - 0.5)
        ax.tick_params(axis='x', which='both', bottom=False, labelbottom=False)
        ax.grid(axis='y', which='major', color='#CCCCCC', linewidth=0.5, zorder=0)
        ax.grid(axis='y', which='minor', color='#EBEBEB', linewidth=0.3, zorder=0)
        for xi in x:
            ax.axvline(xi, color='#DDDDDD', linewidth=0.35, zorder=0)
        for sp in ax.spines.values():
            sp.set_edgecolor('#555'); sp.set_linewidth(0.8)
        ax.spines['bottom'].set_linewidth(1.2)
        ax.spines['bottom'].set_edgecolor('#333')

        patches = [mpatches.Patch(color=C[k], label=k)
                   for k in ['GL', 'TBL', 'FSL', 'CBL']]
        ax.legend(handles=patches, loc='upper left',
                  fontsize=FS_LEGEND, frameon=True, framealpha=0.95,
                  edgecolor='#AAAAAA', ncol=4,
                  handlelength=1.6, handleheight=0.8,
                  borderpad=0.5, labelspacing=0.3)

        # Data table
        ax_t = fig.add_subplot(body_gs[1], sharex=ax)
        ax_t.set_facecolor('white')
        ax_t.set_xlim(-0.5, n - 0.5)
        ax_t.set_ylim(0, N_TABLE_ROWS)
        ax_t.axis('off')

        for ri in range(N_TABLE_ROWS):
            bg = '#EFF3F8' if ri % 2 == 0 else '#FAFAFA'
            ax_t.axhspan(ri, ri + 1, color=bg, zorder=0)
        for ri in range(N_TABLE_ROWS + 1):
            heavy = ri in (0, N_TABLE_ROWS)
            ax_t.hlines(ri, -0.5, n - 0.5,
                        colors='#444' if heavy else '#CCCCCC',
                        linewidth=0.9 if heavy else 0.4, zorder=2)
        for xi in x:
            ax_t.axvline(xi, color='#CCCCCC', linewidth=0.35, zorder=1)

        cell_data = {
            'GL':       ['%.3f' % v for v in dfb['GL'].values],
            'TBL':      ['%.3f' % v for v in dfb['TBL'].values],
            'FSL':      ['%.3f' % v for v in dfb['FSL'].values],
            'CBL':      ['%.3f' % v for v in dfb['CBL'].values],
            'CH_label': ch_lbl,
            'CH_abs':   ch_abs,
        }

        for ri, (key, label, color) in enumerate(TABLE_ROWS):
            yc   = ri + 0.5
            vals = cell_data[key]
            for xi, txt in zip(x, vals):
                ax_t.text(xi, yc, txt, color=color, fontsize=FS_CELL,
                          ha='center', va='center', rotation=90,
                          clip_on=False, fontfamily='monospace', zorder=4)

        x_hdr_fig = GRAPH_FRAC * DATA_LEFT - 0.003
        for ri, (key, label, color) in enumerate(TABLE_ROWS):
            fig.text(
                x_hdr_fig, ROW_Y[ri],
                label,
                color=color, fontsize=FS_ROW_HDR, fontweight='bold',
                ha='right', va='center',
                fontfamily='monospace', zorder=10,
            )

        # Title block
        ax_tb = fig.add_subplot(fig_gs[1])
        draw_title_block(ax_tb, page_no, total_pages, info)

        fig.subplots_adjust(
            left=GRAPH_FRAC * DATA_LEFT,
            right=0.999,
            top=0.998,
            bottom=BOT,
        )

        # MEMORY FIX: save at lower DPI, use tight bbox
        fig.savefig(out_png, dpi=DPI, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        return True

    finally:
        # MEMORY FIX: always close the figure and collect garbage,
        # even if an exception occurred mid-render.
        if fig is not None:
            plt.close(fig)
        plt.close('all')   # belt-and-suspenders: close any orphaned figures
        gc.collect()       # force CPython to release the figure's backing arrays


# ── PDF assembly ──────────────────────────────────────────────────
def build_pdf(img_paths, out_pdf):
    """
    MEMORY FIX: pages are drawn one at a time.
    Each ImageReader is created, drawn, then immediately dereferenced so
    the PNG pixel data does not accumulate in RAM.
    """
    if not REPORTLAB:
        print("reportlab missing, PDF not assembled")
        return
    pw, ph = landscape(A3)
    c  = rl_canvas.Canvas(out_pdf, pagesize=(pw, ph))
    mg = 8 * mm
    aw, ah = pw - 2*mg, ph - 2*mg

    for ip in img_paths:
        # MEMORY FIX: open, draw, close — don't keep all images in a list
        img = ImageReader(ip)
        iw, ih = img.getSize()
        asp = ih / float(iw)
        dw, dh = aw, aw * asp
        if dh > ah:
            dh, dw = ah, ah / asp
        x0 = mg + (aw - dw) / 2
        y0 = mg + (ah - dh) / 2
        c.drawImage(img, x0, y0, width=dw, height=dh, preserveAspectRatio=True)
        c.setStrokeColorRGB(0.3, 0.3, 0.3)
        c.setLineWidth(0.6)
        c.rect(mg, mg, aw, ah)
        c.showPage()
        del img          # MEMORY FIX: dereference pixel data immediately
        gc.collect()

    c.save()


# ── Driver ────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_pdf.py <input> <output.pdf> [meta.json]")
        sys.exit(1)

    in_path, out_pdf = sys.argv[1], sys.argv[2]
    meta_path = sys.argv[3] if len(sys.argv) > 3 else None

    import json, copy
    info = copy.deepcopy(DRAWING_INFO)
    if meta_path and os.path.exists(meta_path):
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                user_meta = json.load(f)
            for k, v in user_meta.items():
                info[k] = v
        except Exception as e:
            print("Warning: could not load meta JSON: %s" % e, file=sys.stderr)

    ext = os.path.splitext(in_path)[1].lower()
    if ext == '.csv':
        df = pd.read_csv(in_path)
    elif ext in ('.xls', '.xlsx'):
        df = pd.read_excel(in_path)
    else:
        print("Unsupported file type: %s" % ext, file=sys.stderr)
        sys.exit(1)

    needed = ['CH', 'GL', 'CBL', 'FSL', 'TBL']
    missing = [c for c in needed if c not in df.columns]
    if missing:
        print("Missing columns: %s" % missing, file=sys.stderr)
        sys.exit(1)

    df = df[needed].dropna(subset=needed).reset_index(drop=True)
    if len(df) == 0:
        print("No valid data rows.", file=sys.stderr)
        sys.exit(1)

    ch_col = df['CH'].astype(float)
    if ch_col.max() < 1000:
        ch_col = (ch_col * 1000).round()
    global_start = ch_label(ch_col.iloc[0])
    global_end   = ch_label(ch_col.iloc[-1])
    info['_global_ch_start'] = global_start
    info['_global_ch_end']   = global_end

    total   = math.ceil(len(df) / BATCH_SIZE)
    out_dir = os.path.dirname(os.path.abspath(out_pdf))
    os.makedirs(out_dir, exist_ok=True)

    tmp_imgs = []
    try:
        for i in range(0, len(df), BATCH_SIZE):
            pg      = i // BATCH_SIZE + 1
            img     = os.path.join(out_dir, '_p%03d.png' % pg)

            # MEMORY FIX: pass an explicit .copy() slice so the batch
            # loop doesn't keep a reference to the full DataFrame alive
            batch   = df.iloc[i:i + BATCH_SIZE].copy()

            if render_page(batch, pg, total, img, info):
                tmp_imgs.append(img)
                print("  Page %d/%d" % (pg, total), flush=True)

            # MEMORY FIX: drop the batch slice reference immediately
            del batch
            gc.collect()

        build_pdf(tmp_imgs, out_pdf)
        print("Done: %s" % out_pdf)

    finally:
        for f in tmp_imgs:
            try:
                os.remove(f)
            except OSError:
                pass
        # Final cleanup
        plt.close('all')
        gc.collect()


if __name__ == '__main__':
    main()